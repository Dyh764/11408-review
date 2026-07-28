from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageEnhance, ImageFilter


ANSWER_MARKER = re.compile(
    r"^0*(\d{1,3})[.．,，、:：·]([A-D](?:[、,，/][A-D])*)(?=$|[^A-Za-z])",
    re.IGNORECASE,
)
FUZZY_ANSWER_MARKER = re.compile(
    r"^([0-9Oo〇Il丨|ZzS伍B&巧]{1,3})[.．,，、:：·]?([A-D](?:[、,，/][A-D])*)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class OriginalBook:
    subject: str
    filename_contains: str
    slug: str
    printed_to_pdf_offset: int


BOOKS = (
    OriginalBook("数据结构", "数据结构", "data-structure", 12),
    OriginalBook("计算机组成原理", "计算机组成原理", "computer-organization", 5),
    OriginalBook("操作系统", "操作系统", "operating-system", 10),
    OriginalBook("计算机网络", "计算机网络", "computer-network", 12),
)

OFFICIAL_ANSWER_OVERRIDES: dict[
    tuple[str, str, int],
    dict[str, Any],
] = {
    (
        "数据结构",
        "5.3二叉树的遍历和线索二叉树",
        36,
    ): {
        "label": "A",
        "pdf_page": 169,
        "printed_page": 157,
        "explanation": (
            "根据后序线索二叉树的定义，该结点为叶结点且有左兄弟，"
            "因此它是右孩子；按后序遍历可知，其后继是父结点，右线索应指向父结点。"
        ),
    },
    (
        "数据结构",
        "8.6各种内部排序算法的比较及应用",
        4,
    ): {
        "label": "",
        "display_answer": "①I、IV、VI；②II、VI、VII；③I、IV",
        "compound": True,
        "pdf_page": 389,
        "printed_page": 377,
        "explanation": (
            "稳定排序为冒泡排序、直接插入排序和归并排序；"
            "平均时间复杂度为 O(nlogn) 的是堆排序、归并排序和快速排序；"
            "最好情况下可达到线性时间的是冒泡排序和直接插入排序。"
        ),
    },
    (
        "计算机组成原理",
        "5.4控制器的功能和工作原理",
        6,
    ): {
        "label": "C",
        "pdf_page": 243,
        "printed_page": 238,
        "explanation": (
            "字段直接编码为保留“不发出微命令”的编码，4 个微命令需要 3 位，"
            "说法 I 错误；说法 II 正确；垂直型微指令执行速度慢，"
            "说法 III 错误；字段间接编码依赖另一字段的译码输出，说法 IV 正确。"
        ),
    },
    (
        "操作系统",
        "2.3同步与互斥",
        31,
    ): {
        "label": "",
        "display_answer": "①C；②B",
        "compound": True,
        "pdf_page": 139,
        "printed_page": 129,
        "explanation": (
            "只要进程不全部阻塞，至少有一个进程正在处理器上运行，"
            "所以就绪队列最多有 n-1 个进程；发生死锁时 n 个进程都可阻塞，"
            "所以阻塞队列最多有 n 个进程。"
        ),
    },
    (
        "操作系统",
        "3.1内存管理概念",
        34,
    ): {
        "label": "",
        "display_answer": "①B；②C",
        "compound": True,
        "pdf_page": 213,
        "printed_page": 203,
        "explanation": (
            "目标程序限定的地址范围是逻辑地址空间，编译地址通常相对始址 0 编号，"
            "因此也称相对地址或逻辑地址。"
        ),
    },
    (
        "计算机网络",
        "1.2计算机网络体系结构与参考模型",
        23,
    ): {
        "label": "",
        "display_answer": "①B；②D；③C；④A；⑤B",
        "compound": True,
        "pdf_page": 39,
        "printed_page": 27,
        "explanation": (
            "流量控制主要位于数据链路层、网络层和传输层；"
            "传输层建立、维护和拆除端到端连接；网络层负责路由；"
            "传输层提供进程到进程的数据传送；数据链路层为网络层提供收发服务。"
        ),
    },
    (
        "计算机网络",
        "6.5万维网",
        4,
    ): {
        "label": "",
        "display_answer": "①C；②C",
        "compound": True,
        "pdf_page": 311,
        "printed_page": 299,
        "explanation": (
            "不知道服务器 IP 地址时，先用 DNS 解析域名，再用 HTTP 获取文档；"
            "DNS 使用 UDP，HTTP 使用 TCP。"
        ),
    },
}


def compact_ocr(value: str) -> str:
    return re.sub(r"\s+", "", value).strip()


def readable_ocr(value: str) -> str:
    text = compact_ocr(value)
    return (
        text.replace("．", "。")
        .replace("，", "，")
        .replace("：", "：")
        .strip("；;")
    )


def parse_answer_marker(
    value: str,
    expected_number: int | None = None,
) -> tuple[int, str, int] | None:
    def labels(raw: str) -> str:
        return "、".join(re.findall(r"[A-D]", raw.upper()))

    exact = ANSWER_MARKER.match(value)
    if exact:
        return int(exact.group(1)), labels(exact.group(2)), exact.end()

    fuzzy = FUZZY_ANSWER_MARKER.match(value)
    if not fuzzy:
        return None
    raw_number = fuzzy.group(1)
    if raw_number.isdigit() and not any(
        punctuation in value for punctuation in ".．,，、:：·"
    ):
        return None
    if raw_number == "巧":
        normalized = "15"
    elif raw_number.endswith("伍") and raw_number[:-1].isdigit():
        prefix = int(raw_number[:-1])
        candidates = [prefix * 10, prefix * 10 + 5]
        number = (
            expected_number
            if expected_number in candidates
            else candidates[0]
        )
        return number, labels(fuzzy.group(2)), fuzzy.end()
    else:
        replacements = {
            "O": "0",
            "o": "0",
            "〇": "0",
            "I": "1",
            "l": "1",
            "丨": "1",
            "|": "1",
            "Z": "2",
            "z": "2",
            "S": "5",
            "伍": "5",
            "B": "8",
            "&": "8",
        }
        normalized = "".join(replacements.get(char, char) for char in raw_number)
    if not normalized.isdigit():
        return None
    return int(normalized), labels(fuzzy.group(2)), fuzzy.end()


def infer_answer_from_explanation(value: str) -> str:
    compact = compact_ocr(value)
    patterns = (
        r"(?:因此|所以|故|只有)?选项([A-D])(?:正确|符合|合理)",
        r"正确(?:答案|选项)(?:是|为)?([A-D])",
        r"答案(?:是|为)?([A-D])",
    )
    for pattern in patterns:
        match = re.search(pattern, compact)
        if match:
            return match.group(1)
    return ""


def find_original_book(root: Path, config: OriginalBook) -> Path:
    matches = sorted(
        path
        for path in root.glob("*.pdf")
        if config.filename_contains in path.name
    )
    if len(matches) != 1:
        raise RuntimeError(
            f"{config.subject} 原书应匹配 1 份 PDF，实际匹配 {len(matches)} 份。"
        )
    return matches[0]


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def build_sections(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    sections: dict[tuple[str, str, int], dict[str, Any]] = {}
    for index, card in enumerate(manifest["cards"]):
        source = card["source"]
        answer_page_ref = int(str(source.get("answer_page_ref") or "0"))
        if answer_page_ref <= 0:
            raise RuntimeError(
                f"第 {index + 1} 题缺少 answer_page_ref，需先运行题库构建脚本。"
            )
        number = int(str(source["problem_number"]))
        key = (str(card["subject"]), str(source["section"]), answer_page_ref)
        section = sections.setdefault(
            key,
            {
                "subject": str(card["subject"]),
                "section": str(source["section"]),
                "answer_page_ref": answer_page_ref,
                "numbers": [],
                "card_indexes": [],
                "scan_pages": [],
            },
        )
        section["numbers"].append(number)
        section["card_indexes"].append(index)

    result = list(sections.values())
    for section in result:
        section["numbers"] = sorted(set(section["numbers"]))
        expected = list(range(1, max(section["numbers"]) + 1))
        if section["numbers"] != expected:
            raise RuntimeError(
                f"{section['subject']} {section['section']} 题号不连续："
                f"{section['numbers'][:8]}...{section['numbers'][-8:]}"
            )
    return result


def render_page(
    pdftoppm: Path,
    pdf_path: Path,
    page_number: int,
    output_path: Path,
    dpi: int,
) -> None:
    if output_path.exists() and output_path.stat().st_size > 0:
        return
    output_path.parent.mkdir(parents=True, exist_ok=True)
    prefix = output_path.with_suffix("")
    completed = subprocess.run(
        [
            str(pdftoppm),
            "-f",
            str(page_number),
            "-l",
            str(page_number),
            "-r",
            str(dpi),
            "-jpeg",
            "-jpegopt",
            "quality=91",
            "-singlefile",
            str(pdf_path),
            str(prefix),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0 or not output_path.exists():
        raise RuntimeError(
            f"渲染失败：{pdf_path.name} 第 {page_number} 页\n"
            f"{completed.stderr.strip()}"
        )


def load_ocr_cache(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    value = load_json(path)
    return value if isinstance(value, dict) else {}


def run_ocr_round(
    powershell: str,
    ocr_script: Path,
    image_paths: list[Path],
    work_root: Path,
    round_number: int,
) -> dict[str, dict[str, Any]]:
    if not image_paths:
        return {}
    round_root = work_root / f"ocr-round-{round_number:02d}"
    if round_root.exists():
        shutil.rmtree(round_root)
    round_root.mkdir(parents=True)
    for image_path in image_paths:
        link_path = round_root / image_path.name
        try:
            os.link(image_path, link_path)
        except OSError:
            shutil.copy2(image_path, link_path)
    output_path = work_root / f"ocr-round-{round_number:02d}.jsonl"
    completed = subprocess.run(
        [
            powershell,
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(ocr_script),
            "-InputDirectory",
            str(round_root),
            "-OutputJsonLines",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        raise RuntimeError(f"Windows OCR 失败：\n{completed.stderr.strip()}")
    rows: dict[str, dict[str, Any]] = {}
    for line in output_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        rows[str(row["file"])] = row
    shutil.rmtree(round_root)
    return rows


def page_line_rows(row: dict[str, Any]) -> list[dict[str, Any]]:
    lines = row.get("lines")
    if not isinstance(lines, list):
        return []
    ordered = sorted(
        (line for line in lines if isinstance(line, dict)),
        key=lambda line: (
            float(line.get("y") or 0),
            float(line.get("x") or 0),
        ),
    )
    return ordered


def build_marker_crop(image_path: Path, output_path: Path) -> None:
    if output_path.exists() and output_path.stat().st_size > 0:
        return
    with Image.open(image_path) as image:
        grayscale = image.convert("L")
        left = round(grayscale.width * 0.08)
        right = round(grayscale.width * 0.35)
        cropped = grayscale.crop((left, 0, right, grayscale.height))
        enlarged = cropped.resize((cropped.width * 2, cropped.height * 2))
        enhanced = (
            ImageEnhance.Contrast(enlarged)
            .enhance(1.5)
            .filter(ImageFilter.SHARPEN)
        )
        output_path.parent.mkdir(parents=True, exist_ok=True)
        enhanced.save(output_path, "PNG", optimize=True)


def marker_events_for_page(
    row: dict[str, Any] | None,
    expected_numbers: set[int],
    previous_number: int,
) -> tuple[list[dict[str, Any]], int]:
    if not row:
        return [], previous_number
    events: list[dict[str, Any]] = []
    for line in page_line_rows(row):
        compact = compact_ocr(str(line.get("text") or ""))
        marker = parse_answer_marker(compact, previous_number + 1)
        if not marker:
            continue
        number, label, _ = marker
        if number not in expected_numbers:
            continue
        events.append(
            {
                "y": float(line.get("y") or 0) / 2,
                "x": float(line.get("x") or 0),
                "text": compact,
                "marker": (number, label, len(compact)),
                "synthetic": True,
            }
        )
        previous_number = number
    return events, previous_number


def parse_section_answers(
    section: dict[str, Any],
    config: OriginalBook,
    ocr_cache: dict[str, dict[str, Any]],
    marker_ocr_cache: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    expected_numbers = set(section["numbers"])
    answers: dict[int, dict[str, Any]] = {}
    current_number: int | None = None
    current_parts: list[str] = []
    started = False
    saw_header = False
    hit_stop = False
    last_label_page = 0
    prelude_parts: list[str] = []
    marker_previous_number = 0

    def finish_current() -> None:
        nonlocal current_number, current_parts
        if current_number is None:
            return
        existing = answers.get(current_number, {})
        explanation = "".join(current_parts).strip("；;。 ")
        existing["explanation"] = explanation
        answers[current_number] = existing
        current_number = None
        current_parts = []

    for pdf_page in section["scan_pages"]:
        filename = f"{config.slug}-answer-p{pdf_page:04d}.jpg"
        row = ocr_cache.get(filename)
        if not row:
            continue
        marker_filename = f"{Path(filename).stem}-markers.png"
        synthetic_markers, marker_previous_number = marker_events_for_page(
            marker_ocr_cache.get(marker_filename)
            if marker_ocr_cache
            else None,
            expected_numbers,
            marker_previous_number,
        )
        synthetic_numbers = {
            int(event["marker"][0])
            for event in synthetic_markers
        }
        events: list[dict[str, Any]] = synthetic_markers
        for line in page_line_rows(row):
            raw_line = str(line.get("text") or "").strip()
            compact = compact_ocr(raw_line)
            full_marker = parse_answer_marker(compact)
            if full_marker and full_marker[0] in synthetic_numbers:
                continue
            events.append(
                {
                    "y": float(line.get("y") or 0),
                    "x": float(line.get("x") or 0),
                    "text": raw_line,
                    "marker": full_marker,
                    "synthetic": False,
                }
            )
        events.sort(
            key=lambda event: (
                float(event["y"]),
                0 if event["synthetic"] else 1,
                float(event["x"]),
            )
        )
        for event in events:
            raw_line = str(event["text"])
            compact = compact_ocr(raw_line)
            if not compact:
                continue
            if "答案与解析" in compact:
                saw_header = True
                continue
            missing_after_current = [
                number
                for number in section["numbers"]
                if number not in answers
                and number > (current_number or 0)
            ]
            expected_number = (
                missing_after_current[0]
                if missing_after_current
                else None
            )
            marker = event["marker"] or parse_answer_marker(
                compact,
                expected_number,
            )
            if marker:
                number, label, marker_end = marker
                if number in expected_numbers and (
                    saw_header or started or number == 1
                ):
                    if (
                        not started
                        and saw_header
                        and number > 1
                        and 1 in expected_numbers
                        and 1 not in answers
                    ):
                        prelude = "".join(prelude_parts)
                        inferred = infer_answer_from_explanation(prelude)
                        if inferred:
                            answers[1] = {
                                "label": inferred,
                                "pdf_page": pdf_page,
                                "printed_page": (
                                    pdf_page - config.printed_to_pdf_offset
                                ),
                                "explanation": readable_ocr(prelude),
                            }
                    finish_current()
                    started = True
                    current_number = number
                    last_label_page = pdf_page
                    answers[number] = {
                        "label": label,
                        "pdf_page": pdf_page,
                        "printed_page": pdf_page - config.printed_to_pdf_offset,
                        "explanation": "",
                    }
                    remainder = compact[marker_end:].strip("；;。 ")
                    if remainder:
                        current_parts.append(remainder)
                    continue
            if not started:
                if saw_header and compact != "单项选择题":
                    prelude_parts.append(readable_ocr(raw_line))
                continue
            if "综合应用题" in compact:
                finish_current()
                hit_stop = True
                break
            if (
                "考研复习指导" in compact
                or re.fullmatch(r"\d{1,3}", compact)
                or compact == "单项选择题"
            ):
                continue
            if current_number is not None:
                current_parts.append(readable_ocr(raw_line))
        if hit_stop:
            break
    finish_current()
    return {
        "answers": answers,
        "hit_stop": hit_stop,
        "last_label_page": last_label_page,
        "missing_numbers": sorted(expected_numbers.difference(answers)),
    }


def inline_explanation(label: str, original_explanation: str) -> str:
    correct_labels = set(re.findall(r"[A-D]", label.upper()))
    display_answer = "、".join(re.findall(r"[A-D]", label.upper()))
    parts: list[str] = []
    for choice in "ABCD":
        if choice in correct_labels:
            detail = f"原书答案包含{choice}（完整答案：{display_answer}）"
            if original_explanation:
                detail += f"，原书解析：{original_explanation}"
        else:
            detail = f"原书答案不包含{choice}，具体辨析见正确选项后的原书解析"
        parts.append(f"{choice}：{detail}")
    return "过程：" + "；".join(parts) + "。"


def enrich_manifest(
    manifest: dict[str, Any],
    sections: list[dict[str, Any]],
    parsed_by_section: dict[tuple[str, str, int], dict[str, Any]],
) -> dict[str, Any]:
    matched = 0
    missing_rows: list[dict[str, Any]] = []
    ambiguous_rows: list[dict[str, Any]] = []
    for section in sections:
        key = (
            section["subject"],
            section["section"],
            section["answer_page_ref"],
        )
        parsed = parsed_by_section[key]
        answers = parsed["answers"]
        for card_index in section["card_indexes"]:
            card = manifest["cards"][card_index]
            source = card["source"]
            number = int(str(source["problem_number"]))
            answer = OFFICIAL_ANSWER_OVERRIDES.get(
                (str(card["subject"]), str(source["section"]), number),
                answers.get(number),
            )
            if not answer:
                missing_rows.append(
                    {
                        "index": card_index + 1,
                        "subject": card["subject"],
                        "section": source["section"],
                        "problem_number": source["problem_number"],
                    }
                )
                continue
            label = str(answer.get("label") or "").upper()
            display_answer = str(answer.get("display_answer") or "").strip()
            if not display_answer:
                display_answer = "、".join(re.findall(r"[A-D]", label))
            explanation = str(answer.get("explanation") or "").strip()
            matched += 1
            source["answer_pdf_page"] = str(answer["pdf_page"])
            source["answer_printed_page"] = str(answer["printed_page"])
            card["standard_answer"] = f"答案：{display_answer}"
            card["answer_explanation"] = (
                f"过程：原书分项答案：{display_answer}。原书解析：{explanation}"
                if answer.get("compound")
                else inline_explanation(label, explanation)
            )
            card["key_steps"] = [
                f"原书答案：{display_answer}",
                explanation or "原书本题未提供展开解析。",
            ]
            card["solution_summary"] = f"原书答案为 {display_answer}。"
            card["one_sentence_tip"] = f"先独立判断，再核对原书答案 {display_answer}。"
            manual_reason = str(source.get("manual_reason") or "").strip()
            card["question_text_status"] = (
                "ai_unverified" if manual_reason else "verified"
            )
            card["answer_status"] = "verified"
            card["answer_source"] = "manual"
            card["confidence"] = "medium" if manual_reason else "high"
            card["needs_manual_check"] = bool(manual_reason)
            card["user_note"] = (
                "题目来自做题本，答案与解析来自对应原书；"
                "保留原题页图用于核对。"
            )
            if not explanation:
                ambiguous_rows.append(
                    {
                        "index": card_index + 1,
                        "subject": card["subject"],
                        "section": source["section"],
                        "problem_number": source["problem_number"],
                        "reason": "已识别官方选项，但原书解析正文为空",
                    }
                )

    manifest["notes"] = [
        "题目和选项由做题本 PDF 的文字层确定，原题页图是最终核对依据。",
        "standard_answer 与解析正文按《2027 年考研复习指导》原书答案页提取。",
        "解析按 A/B/C/D 就地展示；正确选项后保留原书完整解析。",
        "每道题使用独立的原书裁图，避免整页显示、跨题串图和覆盖缓存。",
    ]
    qa = manifest.setdefault("qa", {})
    qa["official_answers_matched"] = matched
    qa["official_answers_missing"] = missing_rows
    qa["official_explanations_empty"] = ambiguous_rows
    qa["official_answer_coverage"] = (
        round(matched / len(manifest["cards"]), 6)
        if manifest["cards"]
        else 0
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="从四本王道原书答案页提取官方答案，并补全题库导入清单。"
    )
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--books", type=Path, required=True)
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--pdftoppm", type=Path, required=True)
    parser.add_argument(
        "--ocr-script",
        type=Path,
        default=Path(__file__).with_name("ocr_images_windows.ps1"),
    )
    parser.add_argument("--powershell", default="powershell.exe")
    parser.add_argument("--dpi", type=int, default=240)
    parser.add_argument("--max-pages-per-section", type=int, default=36)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest_path = args.manifest.resolve()
    books_root = args.books.resolve()
    work_root = args.work.resolve()
    output_path = (args.output or args.manifest).resolve()
    work_root.mkdir(parents=True, exist_ok=True)
    images_root = work_root / "images"
    images_root.mkdir(parents=True, exist_ok=True)
    cache_path = work_root / "ocr-cache.json"
    marker_images_root = work_root / "marker-images"
    marker_images_root.mkdir(parents=True, exist_ok=True)
    marker_cache_path = work_root / "marker-ocr-cache.json"

    manifest = load_json(manifest_path)
    sections = build_sections(manifest)
    configs = {book.subject: book for book in BOOKS}
    pdf_paths = {
        book.subject: find_original_book(books_root, book)
        for book in BOOKS
    }
    ocr_cache = load_ocr_cache(cache_path)
    parsed_by_section: dict[tuple[str, str, int], dict[str, Any]] = {}
    unresolved = list(sections)

    for round_number in range(args.max_pages_per_section):
        requested: dict[str, tuple[OriginalBook, Path, int]] = {}
        for section in unresolved:
            config = configs[section["subject"]]
            next_page = (
                section["answer_page_ref"]
                + config.printed_to_pdf_offset
                + len(section["scan_pages"])
            )
            section["scan_pages"].append(next_page)
            filename = f"{config.slug}-answer-p{next_page:04d}.jpg"
            requested[filename] = (config, pdf_paths[config.subject], next_page)

        new_images: list[Path] = []
        for filename, (_, pdf_path, pdf_page) in requested.items():
            image_path = images_root / filename
            if filename not in ocr_cache:
                render_page(
                    args.pdftoppm.resolve(),
                    pdf_path,
                    pdf_page,
                    image_path,
                    args.dpi,
                )
                new_images.append(image_path)
        ocr_cache.update(
            run_ocr_round(
                args.powershell,
                args.ocr_script.resolve(),
                new_images,
                work_root,
                round_number,
            )
        )
        write_json(cache_path, ocr_cache)

        next_unresolved: list[dict[str, Any]] = []
        matched_now = 0
        for section in unresolved:
            config = configs[section["subject"]]
            parsed = parse_section_answers(section, config, ocr_cache)
            key = (
                section["subject"],
                section["section"],
                section["answer_page_ref"],
            )
            parsed_by_section[key] = parsed
            matched_now += len(parsed["answers"])
            latest_page = section["scan_pages"][-1]
            max_number = max(section["numbers"])
            found_max = max_number in parsed["answers"]
            labels_complete = not parsed["missing_numbers"]
            captured_tail = (
                parsed["hit_stop"]
                or (
                    parsed["last_label_page"] > 0
                    and latest_page > parsed["last_label_page"]
                )
            )
            exhausted_answer_block = captured_tail and (
                found_max or parsed["hit_stop"]
            )
            if not (labels_complete and captured_tail) and not exhausted_answer_block:
                next_unresolved.append(section)
        print(
            json.dumps(
                {
                    "round": round_number + 1,
                    "sections_scanned": len(unresolved),
                    "new_pages": len(new_images),
                    "answers_visible_in_round_sections": matched_now,
                    "sections_remaining": len(next_unresolved),
                },
                ensure_ascii=False,
            ),
            flush=True,
        )
        unresolved = next_unresolved
        if not unresolved:
            break

    for section in sections:
        key = (
            section["subject"],
            section["section"],
            section["answer_page_ref"],
        )
        if key not in parsed_by_section:
            parsed_by_section[key] = parse_section_answers(
                section,
                configs[section["subject"]],
                ocr_cache,
            )

    marker_ocr_cache = load_ocr_cache(marker_cache_path)
    marker_requests: dict[str, Path] = {}
    for section in sections:
        key = (
            section["subject"],
            section["section"],
            section["answer_page_ref"],
        )
        parsed = parsed_by_section[key]
        if not parsed["missing_numbers"]:
            continue
        config = configs[section["subject"]]
        last_useful_page = max(
            section["scan_pages"][0],
            int(parsed["last_label_page"] or section["scan_pages"][0]) + 1,
        )
        for pdf_page in section["scan_pages"]:
            if pdf_page > last_useful_page:
                break
            source_name = f"{config.slug}-answer-p{pdf_page:04d}.jpg"
            marker_name = f"{Path(source_name).stem}-markers.png"
            source_path = images_root / source_name
            marker_path = marker_images_root / marker_name
            if marker_name not in marker_ocr_cache:
                build_marker_crop(source_path, marker_path)
                marker_requests[marker_name] = marker_path

    marker_ocr_cache.update(
        run_ocr_round(
            args.powershell,
            args.ocr_script.resolve(),
            list(marker_requests.values()),
            work_root,
            99,
        )
    )
    write_json(marker_cache_path, marker_ocr_cache)

    for section in sections:
        key = (
            section["subject"],
            section["section"],
            section["answer_page_ref"],
        )
        parsed_by_section[key] = parse_section_answers(
            section,
            configs[section["subject"]],
            ocr_cache,
            marker_ocr_cache,
        )

    enriched = enrich_manifest(manifest, sections, parsed_by_section)
    write_json(output_path, enriched)
    report = {
        "total_questions": len(enriched["cards"]),
        "official_answers_matched": enriched["qa"]["official_answers_matched"],
        "official_answers_missing": enriched["qa"]["official_answers_missing"],
        "official_explanations_empty": enriched["qa"]["official_explanations_empty"],
        "sections": [
            {
                "subject": section["subject"],
                "section": section["section"],
                "answer_page_ref": section["answer_page_ref"],
                "scanned_pdf_pages": section["scan_pages"],
                "matched": len(
                    parsed_by_section[
                        (
                            section["subject"],
                            section["section"],
                            section["answer_page_ref"],
                        )
                    ]["answers"]
                ),
                "expected": len(section["numbers"]),
                "missing_numbers": parsed_by_section[
                    (
                        section["subject"],
                        section["section"],
                        section["answer_page_ref"],
                    )
                ]["missing_numbers"],
            }
            for section in sections
        ],
    }
    write_json(work_root / "answer-qa-report.json", report)
    print(
        json.dumps(
            {
                "output": str(output_path),
                "questions": report["total_questions"],
                "official_answers": report["official_answers_matched"],
                "missing": len(report["official_answers_missing"]),
                "empty_explanations": len(report["official_explanations_empty"]),
                "ocr_pages": len(ocr_cache),
                "marker_ocr_pages": len(marker_ocr_cache),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
