from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import pdfplumber
from PIL import Image


QUESTION_START_PATTERN = re.compile(r"^(\d{1,3})\.(?!\d)(.*)$")
SECTION_NUMBER_PATTERN = re.compile(r"^(\d+)\.(\d+)$")
OPTION_PATTERN = re.compile(r"^([ABCD])\.(.*)$")
IMAGE_DEPENDENCY_PATTERN = re.compile(
    r"如图|见图|下图|上图|图中|图示|所示图|根据.{0,8}图|由.{0,8}图|"
    r"如表|下表|上表|表中|拓扑图|时序图|流程图|结构图|示意图|波形图|状态图|"
    r"存储器芯片图|电路图|报文如下|请求报文如下"
)


@dataclass(frozen=True)
class BookConfig:
    filename_contains: str
    slug: str
    subject: str
    source_name: str
    chapters: dict[int, str]


BOOKS = (
    BookConfig(
        filename_contains="数据结构",
        slug="data-structure",
        subject="数据结构",
        source_name="27王道《数据结构》选择题做题本",
        chapters={
            1: "绪论",
            2: "线性表",
            3: "栈、队列和数组",
            4: "串",
            5: "树与二叉树",
            6: "图",
            7: "查找",
            8: "排序",
        },
    ),
    BookConfig(
        filename_contains="计算机组成原理",
        slug="computer-organization",
        subject="计算机组成原理",
        source_name="王道《计算机组成原理》选择题做题本",
        chapters={
            1: "计算机系统概述",
            2: "数据的表示和运算",
            3: "存储系统",
            4: "指令系统",
            5: "中央处理器",
            6: "总线",
            7: "输入/输出系统",
        },
    ),
    BookConfig(
        filename_contains="操作系统",
        slug="operating-system",
        subject="操作系统",
        source_name="王道《操作系统》选择题做题本",
        chapters={
            1: "操作系统概述",
            2: "进程与线程",
            3: "内存管理",
            4: "文件管理",
            5: "输入输出管理",
        },
    ),
    BookConfig(
        filename_contains="计算机网络",
        slug="computer-network",
        subject="计算机网络",
        source_name="王道《计算机网络》选择题做题本",
        chapters={
            1: "计算机网络体系结构",
            2: "物理层",
            3: "数据链路层",
            4: "网络层",
            5: "传输层",
            6: "应用层",
        },
    ),
)

# 做题本的操作系统 5.2 标题把答案页误印为 P352，实际原书答案从 P334 开始；
# 5.3 标题漏印答案页，实际原书答案从 P352 开始。这里使用原书页图核对后的页码。
ANSWER_PAGE_OVERRIDES = {
    ("操作系统", "5.2"): 334,
    ("操作系统", "5.3"): 352,
}


@dataclass
class Token:
    page: int
    text: str
    x0: float
    x1: float
    top: float
    bottom: float
    size: float
    fontname: str


@dataclass
class Event:
    kind: str
    page: int
    top: float
    token_index: int
    number: str
    title: str
    answer_page_ref: int | None = None


@dataclass
class PageInfo:
    number: int
    width: float
    height: float
    tokens: list[Token]


@dataclass
class ParsedQuestion:
    page_start: int
    page_end: int
    top_start: float
    top_end: float
    section_number: str
    section_title: str
    answer_page_ref: int | None
    problem_number: str
    question_text: str
    choices: list[dict[str, str]]
    image_required: bool
    manual_reason: str


def clean_text(value: str) -> str:
    return (
        value.replace("\u200b", "")
        .replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("", "'")
        .replace("⎳", "/")
        .strip()
    )


def needs_space(previous: Token, current: Token) -> bool:
    gap = current.x0 - previous.x1
    if gap <= 1.8:
        return False
    previous_text = previous.text[-1:] if previous.text else ""
    current_text = current.text[:1] if current.text else ""
    if not previous_text or not current_text:
        return False
    if current_text in "，。；：！？、）】》,.!?;:%)]}" or previous_text in "（【《([{":
        return False
    if previous_text.isascii() and current_text.isascii():
        return True
    return gap >= 5.5


def group_lines(tokens: Iterable[Token]) -> list[list[Token]]:
    lines: list[list[Token]] = []
    for token in sorted(tokens, key=lambda item: (item.page, item.top, item.x0)):
        if (
            not lines
            or lines[-1][0].page != token.page
            or abs(lines[-1][0].top - token.top) > 3.2
        ):
            lines.append([token])
        else:
            lines[-1].append(token)
    for line in lines:
        line.sort(key=lambda item: item.x0)
    return lines


def join_tokens(tokens: Iterable[Token]) -> str:
    line_texts: list[str] = []
    for line in group_lines(tokens):
        pieces: list[str] = []
        previous: Token | None = None
        for token in line:
            text = clean_text(token.text)
            if not text:
                continue
            if previous is not None and needs_space(previous, token):
                pieces.append(" ")
            pieces.append(text)
            previous = token
        value = "".join(pieces).strip()
        if value:
            line_texts.append(value)
    return re.sub(r"\s+", " ", " ".join(line_texts)).strip()


def build_page_info(pdf_path: Path) -> list[PageInfo]:
    pages: list[PageInfo] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            raw_words = page.extract_words(
                keep_blank_chars=False,
                use_text_flow=False,
                x_tolerance=1.4,
                y_tolerance=3,
                extra_attrs=["fontname", "size"],
            )
            tokens = [
                Token(
                    page=page_number,
                    text=str(word.get("text", "")),
                    x0=float(word.get("x0", 0)),
                    x1=float(word.get("x1", 0)),
                    top=float(word.get("top", 0)),
                    bottom=float(word.get("bottom", 0)),
                    size=float(word.get("size", 0)),
                    fontname=str(word.get("fontname", "")),
                )
                for word in raw_words
                if 32 <= float(word.get("top", 0)) <= float(page.height) - 42
            ]
            pages.append(
                PageInfo(
                    number=page_number,
                    width=float(page.width),
                    height=float(page.height),
                    tokens=tokens,
                )
            )
    return pages


def line_for_token(page: PageInfo, target: Token) -> list[Token]:
    return [
        token
        for token in page.tokens
        if abs(token.top - target.top) <= 3.2
    ]


def detect_events(pages: list[PageInfo]) -> list[Event]:
    events: list[Event] = []
    for page in pages:
        for index, token in enumerate(page.tokens):
            section_match = SECTION_NUMBER_PATTERN.match(token.text)
            if (
                section_match
                and token.x0 <= 90
                and token.size >= 10.4
                and "Bold" in token.fontname
            ):
                title_tokens = [
                    item
                    for item in line_for_token(page, token)
                    if item.x0 >= token.x0
                ]
                title = join_tokens(title_tokens)
                following_text = join_tokens(
                    item
                    for item in page.tokens
                    if token.top <= item.top <= token.top + 120
                )
                answer_match = re.search(
                    r"答案.{0,12}?P\s*(\d+)",
                    following_text,
                    re.IGNORECASE,
                )
                events.append(
                    Event(
                        kind="section",
                        page=page.number,
                        top=token.top,
                        token_index=index,
                        number=f"{section_match.group(1)}.{section_match.group(2)}",
                        title=title,
                        answer_page_ref=int(answer_match.group(1)) if answer_match else None,
                    )
                )
                continue

            question_match = QUESTION_START_PATTERN.match(token.text)
            if (
                question_match
                and token.x0 <= 84
                and 8.5 <= token.size <= 11.2
                and token.top >= 34
            ):
                events.append(
                    Event(
                        kind="question",
                        page=page.number,
                        top=token.top,
                        token_index=index,
                        number=question_match.group(1),
                        title="",
                    )
                )

    ordered = sorted(
        events,
        key=lambda item: (item.page, item.top, 0 if item.kind == "section" else 1),
    )
    filtered: list[Event] = []
    expected_question_number = 0
    has_section = False
    for event in ordered:
        if event.kind == "section":
            filtered.append(event)
            has_section = True
            expected_question_number = 1
            continue
        if not has_section:
            continue
        number = int(event.number)
        if number != expected_question_number:
            continue
        filtered.append(event)
        expected_question_number += 1
    return filtered


def tokens_between(
    pages: list[PageInfo],
    start: Event,
    end: Event | None,
) -> list[Token]:
    selected: list[Token] = []
    last_page = end.page if end else pages[-1].number
    for page_number in range(start.page, last_page + 1):
        page = pages[page_number - 1]
        start_top = start.top - 1 if page_number == start.page else 32
        end_top = (
            end.top - 1
            if end and page_number == end.page
            else page.height - 42
        )
        selected.extend(
            token
            for token in page.tokens
            if start_top <= token.top < end_top
        )
    return selected


def split_question_tokens(
    tokens: list[Token],
) -> tuple[str, list[dict[str, str]], str]:
    if not tokens:
        raise ValueError("题目没有可提取文字")

    full_text = join_tokens(tokens)
    start_match = QUESTION_START_PATTERN.match(full_text)
    if not start_match:
        raise ValueError("题号标记未位于题目开头")
    body = clean_text(start_match.group(2))
    if not body:
        raise ValueError("题干为空")

    positions: dict[str, tuple[int, int]] = {}
    search_offset = 0
    for label in "ABCD":
        match = re.search(
            rf"(?<![A-Za-z0-9]){label}\.\s*",
            body[search_offset:],
        )
        if not match:
            placeholder_choices = [
                {"label": item, "text": f"见原图中的 {item} 选项"}
                for item in "ABCD"
            ]
            return body, placeholder_choices, "选项依赖原图或为组合题，文字层未能拆出完整 A/B/C/D"
        absolute_start = search_offset + match.start()
        absolute_end = search_offset + match.end()
        positions[label] = (absolute_start, absolute_end)
        search_offset = absolute_end

    question_text = body[: positions["A"][0]].strip()
    if not question_text:
        raise ValueError("题干为空")
    choices: list[dict[str, str]] = []
    for index, label in enumerate("ABCD"):
        start = positions[label][1]
        end = positions["ABCD"[index + 1]][0] if index < 3 else len(body)
        choice_text = body[start:end].strip()
        if not choice_text:
            placeholder_choices = [
                {"label": item, "text": f"见原图中的 {item} 选项"}
                for item in "ABCD"
            ]
            return body, placeholder_choices, f"{label} 选项为空，需按原图核对"
        choices.append({"label": label, "text": choice_text})

    manual_reason = ""
    remaining_a = re.search(
        r"(?<![A-Za-z0-9])A\.\s*",
        body[positions["D"][1] :],
    )
    if remaining_a or re.search(r"[①②③④⑤]", body):
        manual_reason = "原题含多个子问，答案需按原书逐项核对"
    return question_text, choices, manual_reason


def parse_questions(pages: list[PageInfo]) -> tuple[list[ParsedQuestion], list[dict[str, Any]]]:
    events = detect_events(pages)
    questions: list[ParsedQuestion] = []
    failures: list[dict[str, Any]] = []
    current_section_number = ""
    current_section_title = ""
    current_answer_page_ref: int | None = None

    for event_index, event in enumerate(events):
        if event.kind == "section":
            current_section_number = event.number
            current_section_title = event.title
            current_answer_page_ref = event.answer_page_ref
            continue

        boundary = next(
            (
                candidate
                for candidate in events[event_index + 1 :]
                if candidate.kind in {"question", "section"}
            ),
            None,
        )
        tokens = tokens_between(pages, event, boundary)
        try:
            question_text, choices, manual_reason = split_question_tokens(tokens)
        except ValueError as error:
            failures.append(
                {
                    "page": event.page,
                    "section": current_section_number,
                    "problem_number": event.number,
                    "message": str(error),
                    "preview": join_tokens(tokens[:60]),
                }
            )
            continue

        combined_text = " ".join(
            [question_text, *(choice["text"] for choice in choices)]
        )
        questions.append(
            ParsedQuestion(
                page_start=event.page,
                page_end=boundary.page if boundary else event.page,
                top_start=event.top,
                top_end=boundary.top if boundary else pages[event.page - 1].height - 42,
                section_number=current_section_number,
                section_title=current_section_title,
                answer_page_ref=current_answer_page_ref,
                problem_number=event.number,
                question_text=question_text,
                choices=choices,
                image_required=bool(IMAGE_DEPENDENCY_PATTERN.search(combined_text)),
                manual_reason=manual_reason,
            )
        )

    return questions, failures


def find_pdftoppm(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit)
        if path.exists():
            return path
        raise FileNotFoundError(f"pdftoppm 不存在：{path}")

    known = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "native"
        / "poppler"
        / "Library"
        / "bin"
        / "pdftoppm.exe"
    )
    if known.exists():
        return known
    located = shutil.which("pdftoppm")
    if located:
        return Path(located)
    raise FileNotFoundError("找不到 pdftoppm，请通过 --pdftoppm 指定。")


def render_page(
    pdftoppm: Path,
    pdf_path: Path,
    page_number: int,
    output_path: Path,
    dpi: int,
) -> tuple[int, int]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_prefix = output_path.with_suffix("")
    temporary_png = temporary_prefix.with_suffix(".png")
    subprocess.run(
        [
            str(pdftoppm),
            "-f",
            str(page_number),
            "-singlefile",
            "-png",
            "-r",
            str(dpi),
            str(pdf_path),
            str(temporary_prefix),
        ],
        check=True,
        capture_output=True,
    )
    with Image.open(temporary_png) as image:
        rgb = image.convert("RGB")
        rgb.save(output_path, "WEBP", quality=84, method=6)
        dimensions = rgb.size
    temporary_png.unlink(missing_ok=True)
    return dimensions


def crop_box_pixels(
    page: PageInfo,
    start_top: float,
    end_top: float,
    image_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    scale_x = image_size[0] / page.width
    scale_y = image_size[1] / page.height
    left = max(0, round(58 * scale_x))
    right = min(image_size[0], round((page.width - 54) * scale_x))
    top = max(0, round(max(32, start_top - 7) * scale_y))
    bottom = min(
        image_size[1],
        round(min(page.height - 42, end_top - 7) * scale_y),
    )
    if bottom <= top:
        bottom = min(image_size[1], top + round(80 * scale_y))
    return left, top, right, bottom


def build_question_crop(
    page_assets: dict[int, Path],
    page_infos: list[PageInfo],
    question: ParsedQuestion,
    output_path: Path,
) -> None:
    pieces: list[Image.Image] = []
    for page_number in range(question.page_start, question.page_end + 1):
        page = page_infos[page_number - 1]
        start_top = question.top_start if page_number == question.page_start else 32
        end_top = question.top_end if page_number == question.page_end else page.height - 42
        with Image.open(page_assets[page_number]) as image:
            rgb = image.convert("RGB")
            box = crop_box_pixels(page, start_top, end_top, rgb.size)
            pieces.append(rgb.crop(box))

    width = max(piece.width for piece in pieces)
    gap = 12
    height = sum(piece.height for piece in pieces) + gap * (len(pieces) - 1)
    canvas = Image.new("RGB", (width, height), "white")
    y = 0
    for piece in pieces:
        canvas.paste(piece, (0, y))
        y += piece.height + gap
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "WEBP", quality=86, method=6)


def stable_import_key(
    config: BookConfig,
    section_number: str,
    problem_number: str,
    question_text: str,
) -> str:
    normalized = re.sub(r"\s+", "", question_text)
    digest = hashlib.sha256(
        f"{config.slug}|{section_number}|{problem_number}|{normalized}".encode("utf-8")
    ).hexdigest()[:20]
    return f"wangdao-27-{config.slug}-{digest}"


def section_knowledge_point(question: ParsedQuestion) -> str:
    title = re.sub(r"^\d+\.\d+\s*", "", question.section_title).strip()
    return title or question.section_number or "待整理 / 未分类"


def normalize_known_source_anomalies(
    config: BookConfig,
    questions: list[ParsedQuestion],
) -> list[ParsedQuestion]:
    if config.subject != "操作系统":
        return questions

    normalized: list[ParsedQuestion] = []
    for question in questions:
        if (
            question.section_number == "4.2"
            and question.problem_number == "71"
            and re.sub(r"\s+", "", question.question_text) == "3文件系统"
        ):
            continue
        if (
            question.section_number == "4.2"
            and int(question.problem_number) >= 72
        ):
            question.section_number = "4.3"
            question.section_title = "4.3文件系统"
            question.answer_page_ref = 302
            question.problem_number = str(int(question.problem_number) - 71)
        normalized.append(question)
    return normalized


def source_info(
    config: BookConfig,
    pdf_path: Path,
    question: ParsedQuestion,
    import_key: str,
    asset_file: str,
    image_crop: dict[str, int] | None,
    manual_reason: str,
) -> dict[str, Any]:
    major = int(question.section_number.split(".", 1)[0]) if question.section_number else 0
    answer_page_ref = ANSWER_PAGE_OVERRIDES.get(
        (config.subject, question.section_number),
        question.answer_page_ref,
    )
    result: dict[str, Any] = {
        "type": "题库",
        "name": config.source_name,
        "section": question.section_title or question.section_number,
        "part": "选择题",
        "volume": "2027",
        "paper": "",
        "page": str(question.page_start),
        "problem_number": question.problem_number,
        "raw": (
            f"{config.source_name} {question.section_title or question.section_number} "
            f"第{question.problem_number}题"
        ).strip(),
        "import_key": import_key,
        "asset_file": asset_file,
        "source_file": pdf_path.name,
        "collection_role": "practice_bank",
        "answer_page_ref": str(answer_page_ref or ""),
    }
    if image_crop:
        result["image_crop"] = image_crop
    if manual_reason:
        result["manual_reason"] = manual_reason
    if major:
        result["chapter_number"] = str(major)
    return result


def build_card(
    config: BookConfig,
    pdf_path: Path,
    pages: list[PageInfo],
    question: ParsedQuestion,
    asset_file: str,
    image_size: tuple[int, int],
    dedicated_crop: bool,
) -> dict[str, Any]:
    major = int(question.section_number.split(".", 1)[0]) if question.section_number else 0
    chapter = config.chapters.get(major, "待整理 / 未分类")
    import_key = stable_import_key(
        config,
        question.section_number,
        question.problem_number,
        question.question_text,
    )
    image_crop: dict[str, int] | None = None
    if not dedicated_crop:
        page = pages[question.page_start - 1]
        left, top, right, bottom = crop_box_pixels(
            page,
            question.top_start,
            question.top_end,
            image_size,
        )
        image_crop = {
            "x": left,
            "y": top,
            "width": right - left,
            "height": bottom - top,
            "page_width": image_size[0],
            "page_height": image_size[1],
        }

    return {
        "import_protocol_version": "2.0",
        "subject": config.subject,
        "source": source_info(
            config,
            pdf_path,
            question,
            import_key,
            asset_file,
            image_crop,
            question.manual_reason,
        ),
        "chapter": chapter,
        "knowledge_point": section_knowledge_point(question),
        "question_text": question.question_text,
        "choices": question.choices,
        "question_text_status": "ai_unverified",
        "mastery_status": "完全掌握",
        "user_note": "原题来自本地做题本 PDF；答案解析生成后仍需按原书核对。",
        "mistake_types": [],
        "solution_summary": None,
        "standard_answer": None,
        "answer_explanation": None,
        "key_steps": [],
        "one_sentence_tip": None,
        "related_practice_questions": [],
        "review_priority": "low",
        "confidence": "low",
        "needs_manual_check": True,
        "answer_status": "needs_fix",
        "answer_source": "unknown",
    }


def find_pdf(root: Path, config: BookConfig) -> Path:
    matches = sorted(
        path
        for path in root.glob("*.pdf")
        if config.filename_contains in path.name
    )
    if len(matches) != 1:
        raise RuntimeError(
            f"{config.subject} 应匹配 1 份 PDF，实际匹配 {len(matches)} 份。"
        )
    return matches[0]


def build_package(
    source_root: Path,
    output_root: Path,
    pdftoppm: Path,
    dpi: int,
    render_assets: bool,
) -> dict[str, Any]:
    assets_root = output_root / "assets"
    output_root.mkdir(parents=True, exist_ok=True)
    all_cards: list[dict[str, Any]] = []
    all_assets: list[dict[str, Any]] = []
    qa_failures: list[dict[str, Any]] = []
    book_summaries: list[dict[str, Any]] = []

    for config in BOOKS:
        pdf_path = find_pdf(source_root, config)
        pages = build_page_info(pdf_path)
        questions, failures = parse_questions(pages)
        questions = normalize_known_source_anomalies(config, questions)
        qa_failures.extend(
            {"subject": config.subject, "source_file": pdf_path.name, **failure}
            for failure in failures
        )

        page_assets: dict[int, Path] = {}
        page_sizes: dict[int, tuple[int, int]] = {}
        for page in pages:
            asset_file = f"{config.slug}-p{page.number:03d}.webp"
            asset_path = assets_root / asset_file
            if render_assets:
                page_sizes[page.number] = render_page(
                    pdftoppm,
                    pdf_path,
                    page.number,
                    asset_path,
                    dpi,
                )
            elif asset_path.exists():
                with Image.open(asset_path) as existing:
                    page_sizes[page.number] = existing.size
            else:
                scale = dpi / 72
                page_sizes[page.number] = (
                    round(page.width * scale),
                    round(page.height * scale),
                )
            page_assets[page.number] = asset_path
            all_assets.append(
                {
                    "file": asset_file,
                    "kind": "pdf_page",
                    "subject": config.subject,
                    "source_file": pdf_path.name,
                    "pdf_page": page.number,
                }
            )

        dedicated_count = 0
        for question in questions:
            dedicated_crop = (
                question.image_required
                or question.page_end != question.page_start
                or bool(question.manual_reason)
            )
            if dedicated_crop:
                dedicated_count += 1
                crop_file = (
                    f"{config.slug}-s{question.section_number.replace('.', '-') or 'unknown'}"
                    f"-q{int(question.problem_number):03d}-p{question.page_start:03d}.webp"
                )
                crop_path = assets_root / crop_file
                if render_assets:
                    build_question_crop(
                        page_assets,
                        pages,
                        question,
                        crop_path,
                    )
                all_assets.append(
                    {
                        "file": crop_file,
                        "kind": "question_crop",
                        "subject": config.subject,
                        "source_file": pdf_path.name,
                        "pdf_page": question.page_start,
                        "section": question.section_number,
                        "problem_number": question.problem_number,
                    }
                )
                asset_file = crop_file
                image_size = (0, 0)
            else:
                asset_file = f"{config.slug}-p{question.page_start:03d}.webp"
                image_size = page_sizes[question.page_start]

            card = build_card(
                config,
                pdf_path,
                pages,
                question,
                asset_file,
                image_size,
                dedicated_crop,
            )
            all_cards.append(card)

        book_summaries.append(
            {
                "subject": config.subject,
                "source_file": pdf_path.name,
                "pages": len(pages),
                "question_starts": len(questions) + len(failures),
                "parsed_questions": len(questions),
                "parse_failures": len(failures),
                "dedicated_question_crops": dedicated_count,
            }
        )

    import_keys = [
        str(card["source"]["import_key"])
        for card in all_cards
    ]
    duplicate_keys = sorted(
        key for key in set(import_keys) if import_keys.count(key) > 1
    )
    manifest = {
        "schema_version": "wangdao-question-bank-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "notes": [
            "题目和选项由本地 PDF 排版文字提取，原书页图是核对依据。",
            "先生成题目清单，再运行 extract_wangdao_answers.py 从原书答案页补全官方答案与解析。",
            "相同页图只上传一次；普通题通过 source.image_crop 显示该题区域。",
        ],
        "books": book_summaries,
        "assets": all_assets,
        "cards": all_cards,
        "qa": {
            "total_questions": len(all_cards),
            "total_assets": len(all_assets),
            "parse_failures": qa_failures,
            "duplicate_import_keys": duplicate_keys,
            "missing_sections": [
                {
                    "index": index + 1,
                    "subject": card["subject"],
                    "page": card["source"]["page"],
                    "problem_number": card["source"]["problem_number"],
                }
                for index, card in enumerate(all_cards)
                if not card["source"]["section"]
            ],
            "invalid_choice_counts": [
                {
                    "index": index + 1,
                    "subject": card["subject"],
                    "choice_count": len(card["choices"]),
                }
                for index, card in enumerate(all_cards)
                if len(card["choices"]) != 4
            ],
            "manual_question_cards": [
                {
                    "index": index + 1,
                    "subject": card["subject"],
                    "page": card["source"]["page"],
                    "problem_number": card["source"]["problem_number"],
                    "reason": card["source"].get("manual_reason", ""),
                }
                for index, card in enumerate(all_cards)
                if card["source"].get("manual_reason")
            ],
        },
    }
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_root / "qa-report.json").write_text(
        json.dumps(
            {
                "books": book_summaries,
                "qa": manifest["qa"],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return manifest


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="把四本王道做题本 PDF 转成 11408-review 批量导入包。"
    )
    parser.add_argument("--source", type=Path, required=True, help="四本 PDF 所在目录")
    parser.add_argument("--output", type=Path, required=True, help="导入包输出目录")
    parser.add_argument("--pdftoppm", help="pdftoppm 可执行文件路径")
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument(
        "--no-render",
        action="store_true",
        help="只解析清单，不重新渲染图片；用于快速检查解析规则。",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_root = args.source.resolve()
    output_root = args.output.resolve()
    if not source_root.exists():
        raise FileNotFoundError(f"源目录不存在：{source_root}")
    pdftoppm = find_pdftoppm(args.pdftoppm)
    manifest = build_package(
        source_root=source_root,
        output_root=output_root,
        pdftoppm=pdftoppm,
        dpi=args.dpi,
        render_assets=not args.no_render,
    )
    print(
        json.dumps(
            {
                "manifest": str(output_root / "manifest.json"),
                "questions": manifest["qa"]["total_questions"],
                "assets": manifest["qa"]["total_assets"],
                "failures": len(manifest["qa"]["parse_failures"]),
                "duplicate_import_keys": len(
                    manifest["qa"]["duplicate_import_keys"]
                ),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
