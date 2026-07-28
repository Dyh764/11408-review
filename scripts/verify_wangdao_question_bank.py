from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


SUBJECT_COUNTS = {
    "数据结构": 641,
    "计算机组成原理": 604,
    "操作系统": 650,
    "计算机网络": 564,
}
ANSWER_PATTERN = re.compile(r"^答案：.+$")
CHOICE_ANSWER_PATTERN = re.compile(r"^答案：[A-D](?:、[A-D])*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="检查王道 408 题库导入包完整性。")
    parser.add_argument("--package", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    package_root = args.package.resolve()
    manifest_path = package_root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    cards: list[dict[str, Any]] = manifest.get("cards", [])
    assets: list[dict[str, Any]] = manifest.get("assets", [])
    failures: list[str] = []

    if len(cards) != sum(SUBJECT_COUNTS.values()):
        failures.append(f"题目总数错误：{len(cards)}")
    counts = Counter(str(card.get("subject") or "") for card in cards)
    if dict(counts) != SUBJECT_COUNTS:
        failures.append(f"科目数量错误：{dict(counts)}")

    asset_names = [str(asset.get("file") or "") for asset in assets]
    if len(asset_names) != len(set(asset_names)):
        failures.append("assets 存在重复文件名")
    if any(str(asset.get("kind") or "") != "question_figure" for asset in assets):
        failures.append("assets 中存在非题图本体资产")
    missing_asset_files = [
        name
        for name in asset_names
        if not name or not (package_root / "assets" / name).is_file()
    ]
    if missing_asset_files:
        failures.append(f"缺少 {len(missing_asset_files)} 个图片文件")

    import_keys: list[str] = []
    missing_answers: list[int] = []
    invalid_choices: list[int] = []
    invalid_inline_explanations: list[int] = []
    missing_required_images: list[int] = []
    unexpected_text_question_images: list[int] = []
    invalid_image_required_flags: list[int] = []
    shared_card_assets: list[str] = []
    card_asset_names: list[str] = []
    asset_name_set = set(asset_names)
    for index, card in enumerate(cards, start=1):
        source = card.get("source") if isinstance(card.get("source"), dict) else {}
        import_key = str(source.get("import_key") or "").strip()
        asset_file = str(source.get("asset_file") or "").strip()
        image_required = source.get("image_required")
        card_asset_names.append(asset_file)
        import_keys.append(import_key)
        if not import_key:
            failures.append(f"第 {index} 题缺少 import_key")
        if not isinstance(image_required, bool):
            invalid_image_required_flags.append(index)
        elif image_required and (not asset_file or asset_file not in asset_name_set):
            missing_required_images.append(index)
        elif not image_required and asset_file:
            unexpected_text_question_images.append(index)
        if source.get("image_crop"):
            failures.append(f"第 {index} 题仍依赖整页 CSS 裁切")

        choices = card.get("choices")
        labels = [
            str(choice.get("label") or "").strip()
            for choice in choices
            if isinstance(choice, dict)
        ] if isinstance(choices, list) else []
        if labels != ["A", "B", "C", "D"]:
            invalid_choices.append(index)

        answer = str(card.get("standard_answer") or "").strip()
        if not ANSWER_PATTERN.fullmatch(answer):
            missing_answers.append(index)
        explanation = str(card.get("answer_explanation") or "").strip()
        if CHOICE_ANSWER_PATTERN.fullmatch(answer):
            if not all(f"{label}：" in explanation for label in "ABCD"):
                invalid_inline_explanations.append(index)
        elif "原书分项答案" not in explanation:
            invalid_inline_explanations.append(index)

    duplicate_import_keys = [
        key
        for key, count in Counter(import_keys).items()
        if key and count > 1
    ]
    if duplicate_import_keys:
        failures.append(f"存在 {len(duplicate_import_keys)} 个重复 import_key")
    shared_card_assets = [
        name
        for name, count in Counter(card_asset_names).items()
        if name and count > 1
    ]
    if shared_card_assets:
        failures.append(f"存在 {len(shared_card_assets)} 张被多题共用的图片")
    unreferenced_assets = sorted(asset_name_set - set(card_asset_names))
    if unreferenced_assets:
        failures.append(f"{len(unreferenced_assets)} 张图片没有对应题目")
    image_question_count = sum(
        1
        for card in cards
        if isinstance(card.get("source"), dict)
        and card["source"].get("image_required") is True
    )
    if len(asset_names) != image_question_count:
        failures.append(
            f"配图题与题图数量不一致：配图题 {image_question_count}，题图 {len(asset_names)}"
        )
    if invalid_image_required_flags:
        failures.append(
            f"{len(invalid_image_required_flags)} 题缺少明确的 image_required 标记"
        )
    if missing_required_images:
        failures.append(f"{len(missing_required_images)} 道配图题缺少本题图片")
    if unexpected_text_question_images:
        failures.append(
            f"{len(unexpected_text_question_images)} 道普通文字题错误绑定了图片"
        )
    if invalid_choices:
        failures.append(f"{len(invalid_choices)} 题不是完整 A/B/C/D")
    if missing_answers:
        failures.append(f"{len(missing_answers)} 题缺少官方答案")
    if invalid_inline_explanations:
        failures.append(f"{len(invalid_inline_explanations)} 题缺少逐项解析")

    result = {
        "questions": len(cards),
        "assets": len(asset_names),
        "image_questions": image_question_count,
        "text_only_questions": len(cards) - image_question_count,
        "subject_counts": dict(counts),
        "missing_asset_files": len(missing_asset_files),
        "missing_required_images": len(missing_required_images),
        "unexpected_text_question_images": len(unexpected_text_question_images),
        "invalid_image_required_flags": len(invalid_image_required_flags),
        "unreferenced_assets": len(unreferenced_assets),
        "invalid_choices": len(invalid_choices),
        "missing_answers": len(missing_answers),
        "invalid_inline_explanations": len(invalid_inline_explanations),
        "duplicate_import_keys": len(duplicate_import_keys),
        "shared_card_assets": len(shared_card_assets),
        "failures": failures,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
