#!/usr/bin/env python3
import json
import os
import re
import sys
import zipfile
from lxml import html as lxml_html

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(BASE_DIR, "index.html")
TAILWIND_CSS_PATH = os.path.join(BASE_DIR, "css", "tailwind.built.css")
BUNDLE_JS_PATH = os.path.join(BASE_DIR, "js", "bundle-data.js")
EXPORT_JS_PATH = os.path.join(BASE_DIR, "js", "export.js")
OUTPUT_PATH = os.path.join(BASE_DIR, "HTML_Slide_Tool_단독실행본.html")

CSS_FILES = [
    "css/tailwind.built.css",
    "css/base.css",
    "css/slides.css",
    "css/editor.css",
    "css/studio.css",
    "css/print.css",
]
JS_FILES = [
    "js/state.js",
    "js/history.js",
    "js/storage.js",
    "js/navigation.js",
    "js/find-replace.js",
    "js/presenter-view.js",
    "js/filmstrip.js",
    "js/text-editor.js",
    "js/selection.js",
    "js/bento-grid.js",
    "js/media.js",
    "js/charts.js",
    "js/theme.js",
    "js/effects.js",
    "js/floating-cards.js",
    "js/widgets.js",
    "js/export.js",
    "js/pwa-fs.js",
    "js/studio.js",
    "js/smart-guides.js",
    "js/main.js",
    "js/safe-events.js",
]

COLORS = {
    "transparent": "transparent", "white": "#FFFFFF", "black": "#000000",
    "canvas": "#F5F5F7", "surface": "#FFFFFF", "ink": "#111111", "muted": "#4B5563", "subtle": "#9CA3AF", "borderline": "#E2E4E9",
    "gopro": "var(--accent-color, #0055FF)", "goproDark": "#003EC2", "marker": "#FFE600",
    "emerald-50": "#ECFDF5", "emerald-100": "#D1FAE5", "emerald-200": "#A7F3D0", "emerald-300": "#6EE7B7",
    "emerald-600": "#059669", "emerald-700": "#047857", "emerald-900": "#064E3B",
    "rose-50": "#FFF1F2", "rose-100": "#FFE4E6", "rose-200": "#FECDD3", "rose-400": "#FB7185",
    "rose-500": "#F43F5E", "rose-600": "#E11D48", "rose-700": "#BE123C", "rose-800": "#9F1239",
    "amber-50": "#FFFBEB", "amber-100": "#FEF3C7", "amber-200": "#FDE68A", "amber-300": "#FCD34D",
    "amber-400": "#FBBF24", "amber-500": "#F59E0B", "amber-600": "#D97706", "amber-700": "#B45309", "amber-900": "#78350F",
    "indigo-50": "#EEF2FF", "indigo-200": "#C7D2FE", "indigo-500": "#6366F1", "indigo-600": "#4F46E5",
    "indigo-700": "#4338CA", "indigo-900": "#312E81",
    "violet-50": "#F5F3FF", "violet-200": "#DDD6FE", "violet-500": "#8B5CF6", "violet-600": "#7C3AED",
    "violet-700": "#6D28D9", "violet-900": "#4C1D95",
    "sky-200": "#BAE6FD", "sky-300": "#7DD3FC", "sky-400": "#38BDF8", "sky-600": "#0284C7",
    "neutral-200": "#E5E5E5", "neutral-300": "#D4D4D4", "neutral-400": "#A3A3A3",
    "neutral-800": "#262626", "neutral-900": "#171717",
    "slate-50": "#F8FAFC", "slate-100": "#F1F5F9", "slate-200": "#E2E8F0", "slate-400": "#94A3B8",
    "slate-700": "#334155", "slate-900": "#0F172A",
    "red-500": "#EF4444", "blue-600": "#2563EB", "blue-950": "#172554", "yellow-300": "#FDE047",
}

SPACING = {
    "0": "0px", "0.2": "0.05rem", "0.5": "0.125rem", "1": "0.25rem", "1.5": "0.375rem", "2": "0.5rem", "2.5": "0.625rem",
    "3": "0.75rem", "3.5": "0.875rem", "4": "1rem", "5": "1.25rem", "6": "1.5rem", "7": "1.75rem",
    "8": "2rem", "9": "2.25rem", "10": "2.5rem", "11": "2.75rem", "12": "3rem", "14": "3.5rem",
    "16": "4rem", "20": "5rem", "24": "6rem", "28": "7rem", "32": "8rem", "36": "9rem", "40": "10rem",
    "44": "11rem", "48": "12rem", "52": "13rem", "56": "14rem", "60": "15rem", "64": "16rem",
    "full": "100%", "auto": "auto", "screen": "100vw", "fit": "fit-content"
}

def hex_to_rgba_css(hex_val, alpha_pct):
    if not hex_val.startswith("#"):
        return hex_val
    h = hex_val.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r}, {g}, {b}, {round(int(alpha_pct)/100.0, 2)})"

def resolve_color(token):
    if "/" in token:
        base, alpha = token.split("/", 1)
        if base in COLORS and alpha.isdigit():
            c = COLORS[base]
            if c.startswith("#"):
                return hex_to_rgba_css(c, alpha), None
            # Provide rgba fallback for var(--accent-color) alpha mixes
            fallback = hex_to_rgba_css("#0055FF", alpha)
            return f"color-mix(in srgb, {c} {alpha}%, transparent)", fallback
    if token.startswith("[") and token.endswith("]"):
        return token[1:-1], None
    if token in COLORS:
        return COLORS[token], None
    return None, None

def resolve_size(token, is_height=False):
    if token in SPACING:
        return "100vh" if (token == "screen" and is_height) else SPACING[token]
    if token.startswith("[") and token.endswith("]"):
        return token[1:-1]
    if "/" in token:
        a, b = token.split("/", 1)
        if a.isdigit() and b.isdigit() and int(b) != 0:
            return f"{round((int(a)/int(b))*100, 4)}%"
    return None

def escape_css_ident(cls):
    return re.sub(r"([^a-zA-Z0-9_-])", r"\\\1", cls)

def compile_single_utility(core):
    static_map = {
        "block": "display: block;", "inline-block": "display: inline-block;",
        "inline": "display: inline;", "flex": "display: flex;", "inline-flex": "display: inline-flex;",
        "grid": "display: grid;", "table": "display: table;", "hidden": "display: none;",
        "fixed": "position: fixed;", "absolute": "position: absolute;", "relative": "position: relative;",
        "sticky": "position: sticky;", "static": "position: static;",
        "flex-col": "flex-direction: column;", "flex-row": "flex-direction: row;",
        "flex-wrap": "flex-wrap: wrap;", "flex-1": "flex: 1 1 0%;", "shrink-0": "flex-shrink: 0;",
        "items-start": "align-items: flex-start;", "items-center": "align-items: center;", "items-end": "align-items: flex-end;",
        "justify-start": "justify-content: flex-start;", "justify-center": "justify-content: center;",
        "justify-end": "justify-content: flex-end;", "justify-between": "justify-content: space-between;",
        "justify-around": "justify-content: space-around;", "col-span-full": "grid-column: 1 / -1;",
        "text-left": "text-align: left;", "text-center": "text-align: center;", "text-right": "text-align: right;",
        "font-sans": 'font-family: "Pretendard", "Noto Sans KR", sans-serif;',
        "font-mono": 'font-family: "JetBrains Mono", monospace;',
        "font-normal": "font-weight: 400;", "font-medium": "font-weight: 500;", "font-semibold": "font-weight: 600;",
        "font-bold": "font-weight: 700;", "font-extrabold": "font-weight: 800;", "font-black": "font-weight: 900;",
        "italic": "font-style: italic;", "underline": "text-decoration-line: underline;",
        "line-through": "text-decoration-line: line-through;", "no-underline": "text-decoration-line: none;",
        "uppercase": "text-transform: uppercase;",
        "truncate": "overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
        "whitespace-nowrap": "white-space: nowrap;", "break-all": "word-break: break-all;",
        "select-none": "user-select: none; -webkit-user-select: none;",
        "cursor-pointer": "cursor: pointer;", "cursor-move": "cursor: move;", "cursor-crosshair": "cursor: crosshair;",
        "pointer-events-none": "pointer-events: none;", "pointer-events-auto": "pointer-events: auto;",
        "overflow-hidden": "overflow: hidden;", "overflow-auto": "overflow: auto;", "overflow-visible": "overflow: visible;",
        "overflow-y-auto": "overflow-y: auto;", "overflow-x-auto": "overflow-x: auto;", "overflow-x-hidden": "overflow-x: hidden;",
        "border": "border-width: 1px;", "border-0": "border-width: 0px;", "border-2": "border-width: 2px;",
        "border-t": "border-top-width: 1px;", "border-b": "border-bottom-width: 1px;", "border-b-0": "border-bottom-width: 0px;",
        "border-l": "border-left-width: 1px;", "border-r": "border-right-width: 1px;",
        "border-x": "border-left-width: 1px; border-right-width: 1px;",
        "border-dashed": "border-style: dashed;", "border-solid": "border-style: solid;",
        "rounded": "border-radius: 0.25rem;", "rounded-md": "border-radius: 0.375rem;", "rounded-lg": "border-radius: 0.5rem;",
        "rounded-xl": "border-radius: 0.75rem;", "rounded-2xl": "border-radius: 1rem;", "rounded-full": "border-radius: 9999px;",
        "rounded-l": "border-top-left-radius: 0.25rem; border-bottom-left-radius: 0.25rem;",
        "rounded-r": "border-top-right-radius: 0.25rem; border-bottom-right-radius: 0.25rem;",
        "rounded-t-lg": "border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem;",
        "shadow-2xs": "--tw-shadow: 0 1px 1px 0 rgb(0 0 0 / 0.04); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-xs": "--tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-sm": "--tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-md": "--tw-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-lg": "--tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-2xl": "--tw-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "shadow-inner": "--tw-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05); box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);",
        "ring-2": "--tw-ring-offset-shadow: 0 0 #0000; --tw-ring-shadow: 0 0 0 2px var(--tw-ring-color, #111111); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);",
        "ring-ink": "--tw-ring-color: #111111;",
        "object-contain": "object-fit: contain;", "object-cover": "object-fit: cover;",
        "-rotate-90": "transform: rotate(-90deg);", "-translate-x-1/2": "transform: translateX(-50%);",
        "-top-2": "top: -0.5rem;", "-right-2": "right: -0.5rem;", "float-right": "float: right;",
        "inset-0": "inset: 0px;", "inset-4": "inset: 1rem;", "inset-5": "inset: 1.25rem;", "inset-6": "inset: 1.5rem;",
        "inset-x-2": "left: 0.5rem; right: 0.5rem;", "inset-x-3": "left: 0.75rem; right: 0.75rem;", "inset-x-4": "left: 1rem; right: 1rem;",
        "text-xs": "font-size: 0.75rem; line-height: 1rem;",
        "text-sm": "font-size: 0.875rem; line-height: 1.25rem;",
        "text-base": "font-size: 1rem; line-height: 1.5rem;",
        "text-lg": "font-size: 1.125rem; line-height: 1.75rem;",
        "text-xl": "font-size: 1.25rem; line-height: 1.75rem;",
        "text-2xl": "font-size: 1.5rem; line-height: 2rem;",
        "text-3xl": "font-size: 1.875rem; line-height: 2.25rem;",
        "text-4xl": "font-size: 2.25rem; line-height: 2.5rem;",
        "text-5xl": "font-size: 3rem; line-height: 1;",
        "text-6xl": "font-size: 3.75rem; line-height: 1;",
        "text-7xl": "font-size: 4.5rem; line-height: 1;",
        "leading-none": "line-height: 1;", "leading-tight": "line-height: 1.25;",
        "leading-snug": "line-height: 1.375;", "leading-relaxed": "line-height: 1.625;",
        "tracking-tight": "letter-spacing: -0.025em;", "tracking-wide": "letter-spacing: 0.025em;",
        "tracking-wider": "letter-spacing: 0.05em;", "tracking-widest": "letter-spacing: 0.1em;",
        "line-clamp-1": "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1;",
        "line-clamp-2": "overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;",
        "backdrop-blur-xs": "backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);",
        "outline-none": "outline: 2px solid transparent; outline-offset: 2px;",
        "transition": "transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;",
        "transition-all": "transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;",
        "transition-colors": "transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;",
        "transition-opacity": "transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;",
        "duration-200": "transition-duration: 200ms;", "duration-300": "transition-duration: 300ms;",
        "ease-out": "transition-timing-function: cubic-bezier(0, 0, 0.2, 1);",
        "bg-gradient-to-tr": "background-image: linear-gradient(to top right, var(--tw-gradient-stops, #172554, #0055FF, #38BDF8));",
    }
    if core in static_map:
        return static_map[core]
    m = re.match(r"^grid-cols-(\d+)$", core)
    if m:
        return f"grid-template-columns: repeat({m.group(1)}, minmax(0, 1fr));"
    m = re.match(r"^col-span-(\d+)$", core)
    if m:
        return f"grid-column: span {m.group(1)} / span {m.group(1)};"
    m = re.match(r"^gap-(x-|y-)?(.+)$", core)
    if m:
        sz = resolve_size(m.group(2))
        if sz:
            prop = "column-gap" if m.group(1) == "x-" else ("row-gap" if m.group(1) == "y-" else "gap")
            return f"{prop}: {sz};"
    m = re.match(r"^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr)-(.+)$", core)
    if m:
        kind, raw_v = m.group(1), m.group(2)
        sz = resolve_size(raw_v)
        if sz:
            p_map = {
                "p": f"padding: {sz};", "px": f"padding-left: {sz}; padding-right: {sz};",
                "py": f"padding-top: {sz}; padding-bottom: {sz};", "pt": f"padding-top: {sz};",
                "pb": f"padding-bottom: {sz};", "pl": f"padding-left: {sz};", "pr": f"padding-right: {sz};",
                "m": f"margin: {sz};", "mx": f"margin-left: {sz}; margin-right: {sz};",
                "my": f"margin-top: {sz}; margin-bottom: {sz};", "mt": f"margin-top: {sz};",
                "mb": f"margin-bottom: {sz};", "ml": f"margin-left: {sz};", "mr": f"margin-right: {sz};",
            }
            return p_map[kind]
    m = re.match(r"^(w|h|min-w|max-w|min-h|max-h)-(.+)$", core)
    if m:
        kind, raw_v = m.group(1), m.group(2)
        if raw_v.startswith("max-w-"):
            raw_v = raw_v[6:]
        max_w_presets = {"xs": "20rem", "sm": "24rem", "md": "28rem", "lg": "32rem", "xl": "36rem", "2xl": "42rem", "3xl": "48rem", "4xl": "56rem", "5xl": "64rem", "none": "none"}
        sz = max_w_presets.get(raw_v) if kind == "max-w" and raw_v in max_w_presets else resolve_size(raw_v, is_height=("h" in kind))
        if sz:
            prop_map = {"w": "width", "h": "height", "min-w": "min-width", "max-w": "max-width", "min-h": "min-height", "max-h": "max-height"}
            return f"{prop_map[kind]}: {sz};"
    m = re.match(r"^(top|bottom|left|right)-(.+)$", core)
    if m:
        sz = resolve_size(m.group(2), is_height=m.group(1) in ("top", "bottom"))
        if sz:
            return f"{m.group(1)}: {sz};"
    m = re.match(r"^z-(\d+)$", core)
    if m:
        return f"z-index: {m.group(1)};"
    m = re.match(r"^opacity-(\d+)$", core)
    if m:
        return f"opacity: {round(int(m.group(1))/100.0, 2)};"
    m = re.match(r"^text-\[(.+)\]$", core)
    if m:
        val = m.group(1)
        if val.startswith("#") or val.startswith("rgb"):
            return f"color: {val};"
        return f"font-size: {val};"
    m = re.match(r"^leading-\[(.+)\]$", core)
    if m:
        return f"line-height: {m.group(1)};"
    m = re.match(r"^tracking-\[(.+)\]$", core)
    if m:
        return f"letter-spacing: {m.group(1)};"
    m = re.match(r"^from-(.+)$", core)
    if m:
        col, _ = resolve_color(m.group(1))
        if col:
            return f"--tw-gradient-from: {col}; --tw-gradient-to: rgba(255, 255, 255, 0); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);"
    m = re.match(r"^via-(.+)$", core)
    if m:
        col, _ = resolve_color(m.group(1))
        if col:
            return f"--tw-gradient-to: rgba(255, 255, 255, 0); --tw-gradient-stops: var(--tw-gradient-from), {col}, var(--tw-gradient-to);"
    m = re.match(r"^to-(.+)$", core)
    if m:
        col, _ = resolve_color(m.group(1))
        if col:
            return f"--tw-gradient-to: {col};"
    m = re.match(r"^bg-(.+)$", core)
    if m:
        col, fb = resolve_color(m.group(1))
        if col:
            return (f"background-color: {fb}; background-color: {col};" if fb else f"background-color: {col};")
    m = re.match(r"^text-(.+)$", core)
    if m:
        col, fb = resolve_color(m.group(1))
        if col:
            return (f"color: {fb}; color: {col};" if fb else f"color: {col};")
    m = re.match(r"^border-(.+)$", core)
    if m:
        col, fb = resolve_color(m.group(1))
        if col:
            return (f"border-color: {fb}; border-color: {col};" if fb else f"border-color: {col};")
    return None

def get_utility_cascade_rank(core):
    """Exact Tailwind CSS v3 cascade precedence: shorthands before longhands, hidden after flex/grid."""
    if core in ("fixed", "absolute", "relative", "sticky", "static"): return 10
    if core.startswith("inset-x-") or core.startswith("inset-y-"): return 12
    if core.startswith("inset-"): return 11
    if re.match(r"^-?(top|right|bottom|left)-", core): return 13
    if core.startswith("z-") or core.startswith("float-"): return 15
    if core.startswith("m-"): return 20
    if core.startswith("mx-") or core.startswith("my-"): return 21
    if re.match(r"^m[trbl]-", core): return 22
    if core in ("block", "inline-block", "inline", "flex", "inline-flex", "table", "grid"): return 30
    if core == "hidden": return 31
    if re.match(r"^(w|h|min-w|max-w|min-h|max-h)-", core) or core in ("flex-1", "shrink-0"): return 35
    if core.startswith("grid-cols-") or core.startswith("col-span-"): return 40
    if core.startswith("flex-") or core.startswith("items-") or core.startswith("justify-"): return 42
    if core.startswith("gap-"): return 43
    if core.startswith("space-"): return 44
    if core in ("overflow-hidden", "overflow-auto", "overflow-visible"): return 50
    if core.startswith("overflow-x-") or core.startswith("overflow-y-") or core in ("truncate", "whitespace-nowrap", "break-all"): return 51
    if core in ("rounded", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full"): return 55
    if core.startswith("rounded-"): return 56
    if core in ("border", "border-0", "border-2"): return 60
    if core in ("border-x", "border-y"): return 61
    if core in ("border-t", "border-r", "border-b", "border-l", "border-b-0"): return 62
    if core in ("border-solid", "border-dashed"): return 63
    if core.startswith("border-"): return 64
    if core.startswith("bg-gradient-"): return 70
    if core.startswith("from-"): return 71
    if core.startswith("via-"): return 72
    if core.startswith("to-"): return 73
    if core.startswith("bg-"): return 74
    if core.startswith("object-"): return 75
    if core.startswith("p-"): return 80
    if core.startswith("px-") or core.startswith("py-"): return 81
    if re.match(r"^p[trbl]-", core): return 82
    if core.startswith("text-") or core.startswith("font-") or core.startswith("leading-") or core.startswith("tracking-"): return 85
    return 90

def extract_all_class_tokens(sources):
    tokens = set()
    for src in sources:
        clean_src = re.sub(r'<style[\s\S]*?</style>', '', src)
        for m in re.finditer(r'(?:class|className)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|`([^`]*)`)', clean_src):
            val = m.group(1) or m.group(2) or m.group(3) or ''
            inner_strs = re.findall(r'[\'"]([^\'"]+)[\'"]', val)
            base_val = re.sub(r'\$\{[^}]*\}', ' ', val)
            for chunk in [base_val] + inner_strs:
                for tok in chunk.split():
                    if re.match(r'^-?[a-zA-Z0-9_:/.\[\]#%-]+$', tok):
                        tokens.add(tok)
        for m in re.finditer(r'classList\.(?:add|toggle|remove)\(([^)]+)\)', clean_src):
            for s in re.findall(r'[\'"]([^\'"]+)[\'"]', m.group(1)):
                for tok in s.split():
                    if re.match(r'^-?[a-zA-Z0-9_:/.\[\]#%-]+$', tok):
                        tokens.add(tok)
        for m in re.finditer(r'[\'"]((?:[a-zA-Z0-9_:/.\[\]#%-]+\s+){2,}[a-zA-Z0-9_:/.\[\]#%-]+)[\'"]', clean_src):
            s = m.group(1)
            if any(k in s for k in ['bg-', 'text-', 'px-', 'py-', 'rounded', 'border', 'flex', 'grid']):
                for tok in s.split():
                    if re.match(r'^-?[a-zA-Z0-9_:/.\[\]#%-]+$', tok) and not tok.startswith('http'):
                        tokens.add(tok)
    return tokens

def build_compiled_tailwind_css(sources):
    tokens = extract_all_class_tokens(sources)

    preflight_rules = [
        "/* HTML Slide Tool Production Static Tailwind CSS (Zero CDN — Built by build.py) */",
        "*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; border-color: #E2E4E9; }",
        "html { line-height: 1.5; -webkit-text-size-adjust: 100%; tab-size: 4; font-family: \"Pretendard\", \"Noto Sans KR\", -apple-system, BlinkMacSystemFont, sans-serif; }",
        "body { margin: 0; line-height: inherit; }",
        "hr { height: 0; color: inherit; border-top-width: 1px; }",
        "h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; margin: 0; }",
        "a { color: inherit; text-decoration: inherit; }",
        "b, strong { font-weight: bolder; }",
        "code, kbd, samp, pre { font-family: \"JetBrains Mono\", ui-monospace, SFMono-Regular, monospace; font-size: 1em; }",
        "table { text-indent: 0; border-color: inherit; border-collapse: collapse; }",
        "button, input, optgroup, select, textarea { font-family: inherit; font-feature-settings: inherit; font-variation-settings: inherit; font-size: 100%; font-weight: inherit; line-height: inherit; color: inherit; margin: 0; padding: 0; }",
        "button, select { text-transform: none; }",
        "button, [type='button'], [type='reset'], [type='submit'] { -webkit-appearance: button; background-color: transparent; background-image: none; }",
        "blockquote, dl, dd, h1, h2, h3, h4, h5, h6, hr, figure, p, pre { margin: 0; }",
        "ol, ul, menu { list-style: none; margin: 0; padding: 0; }",
        "textarea { resize: vertical; }",
        "input::placeholder, textarea::placeholder { opacity: 1; color: #9CA3AF; }",
        "button, [role='button'] { cursor: pointer; }",
        ":disabled { cursor: default; }",
        "img, svg, video, canvas, audio, iframe, embed, object { display: block; vertical-align: middle; }",
        "img, video { max-width: 100%; height: auto; }",
        "[hidden] { display: none; }",
        "/* Space-Y / Space-X Stack Utilities */",
        r".space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.25rem; }",
        r".space-y-1\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.375rem; }",
        r".space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.5rem; }",
        r".space-y-2\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.625rem; }",
        r".space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }",
        r".space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }",
        r".space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.25rem; }",
    ]

    bp_order = {"": 0, "sm": 1, "md": 2, "lg": 3}
    bp_queries = {"sm": "(min-width: 640px)", "md": "(min-width: 768px)", "lg": "(min-width: 1024px)"}
    buckets = {
        ("", False): [], ("", True): [],
        ("sm", False): [], ("sm", True): [],
        ("md", False): [], ("md", True): [],
        ("lg", False): [], ("lg", True): [],
    }

    for tok in tokens:
        parts = tok.split(":")
        core, prefixes = parts[-1], parts[:-1]
        decl = compile_single_utility(core)
        if not decl:
            continue
        bp = next((p for p in prefixes if p in bp_queries), "")
        pseudo_prefixes = [p for p in prefixes if p not in bp_queries and p != ""]
        is_pseudo = len(pseudo_prefixes) > 0

        sel = "." + escape_css_ident(tok)
        if "group-hover" in pseudo_prefixes:
            sel = ".group:hover " + sel
        if "hover" in pseudo_prefixes:
            sel += ":hover"
        if "focus" in pseudo_prefixes:
            sel += ":focus"
        if "focus-within" in pseudo_prefixes:
            sel += ":focus-within"
        if "disabled" in pseudo_prefixes:
            sel += ":disabled"

        rule_str = f"{sel} {{ {decl} }}"
        buckets[(bp, is_pseudo)].append((get_utility_cascade_rank(core), tok, rule_str))

    output_lines = list(preflight_rules)
    for bp in ["", "sm", "md", "lg"]:
        layer_rules = []
        for is_pseudo in (False, True):
            entries = sorted(buckets[(bp, is_pseudo)], key=lambda x: (x[0], x[1]))
            layer_rules.extend(r for _, _, r in entries)
        if not layer_rules:
            continue
        if bp == "":
            output_lines.append("/* Layer: Base & State Utilities */")
            output_lines.extend(layer_rules)
        else:
            output_lines.append(f"/* Layer: Responsive {bp} {bp_queries[bp]} */")
            output_lines.append(f"@media {bp_queries[bp]} {{")
            for r in layer_rules:
                output_lines.append("  " + r)
            output_lines.append("}")

    return "\n".join(output_lines) + "\n"

def generate_static_tailwind_css():
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    js_sources = []
    for rel in JS_FILES:
        with open(os.path.join(BASE_DIR, rel), "r", encoding="utf-8") as jf:
            js_sources.append(jf.read())
    compiled_tw = build_compiled_tailwind_css([html] + js_sources)
    with open(TAILWIND_CSS_PATH, "w", encoding="utf-8") as tf:
        tf.write(compiled_tw)
    print(f"정적 Tailwind CSS 생성 완료: {TAILWIND_CSS_PATH} ({os.path.getsize(TAILWIND_CSS_PATH)/1024:.1f} KB)")
    return html, js_sources


def sync_service_worker_version():
    sw_path = os.path.join(BASE_DIR, "sw.js")
    guide_path = os.path.join(BASE_DIR, "docs", "PROJECT_GUIDE.md")
    if not os.path.exists(sw_path) or not os.path.exists(guide_path):
        return
    with open(guide_path, "r", encoding="utf-8") as gf:
        m = re.search(r"`(v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)`", gf.read())
    ver = m.group(1) if m else "v5.1.0"
    with open(sw_path, "r", encoding="utf-8") as sf:
        sw_src = sf.read()
    next_sw = re.sub(r"const CACHE_NAME = 'html-slide-tool-[^']+';", f"const CACHE_NAME = 'html-slide-tool-{ver}';", sw_src, count=1)
    if next_sw != sw_src:
        with open(sw_path, "w", encoding="utf-8") as sf:
            sf.write(next_sw)

def sync_export_bundle():
    sync_service_worker_version()
    css_bundle = {}
    for rel in CSS_FILES:
        with open(os.path.join(BASE_DIR, rel), "r", encoding="utf-8") as f:
            css_bundle[rel] = f.read()
    js_bundle = {}
    for rel in JS_FILES:
        with open(os.path.join(BASE_DIR, rel), "r", encoding="utf-8") as f:
            js_bundle[rel] = f.read()

    bundle_json = json.dumps({"css": css_bundle, "js": js_bundle}, ensure_ascii=False)
    bundle_json = bundle_json.replace("</script>", "<\\/script>").replace("</SCRIPT>", "<\\/SCRIPT>")
    with open(BUNDLE_JS_PATH, "w", encoding="utf-8") as f:
        f.write("/* Auto-generated standalone bundle data for index.html exports — do not edit manually */\nwindow.PPT_STANDALONE_BUNDLE = " + bundle_json + ";\n")
    print(f"번들 동기화 완료: {BUNDLE_JS_PATH}")
    return list(js_bundle.values())

def verify_js_lexical_syntax(filename, code):
    i = 0
    n = len(code)
    line = 1
    stack = []
    in_line_comment = False
    in_block_comment = False
    in_str = None
    str_start_line = 0
    tmpl_brace_stack = []
    prev_token = ""
    regex_prev = {
        "", "(", "[", "{", ",", ";", ":", "=", "!", "&", "|", "?", "+", "-", "*", "%", "~", "^", "<", ">",
        "return", "typeof", "void", "delete", "throw", "case"
    }
    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""
        if ch == "\n":
            if in_str in ('"', "'"):
                raise RuntimeError(f"[{filename}] 종료되지 않은 문자열 리터럴 {in_str!r} (line {str_start_line})")
            line += 1
            in_line_comment = False
            i += 1
            continue
        if in_line_comment:
            i += 1
            continue
        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
        if in_str:
            if ch == "\\":
                if nxt == "\n":
                    line += 1
                i += 2
                continue
            if in_str == "`" and ch == "$" and nxt == "{":
                tmpl_brace_stack.append(len(stack))
                stack.append(("{", line))
                in_str = None
                prev_token = "{"
                i += 2
                continue
            if ch == in_str:
                in_str = None
                prev_token = "STR"
            i += 1
            continue
        if ch == "/" and nxt == "/":
            in_line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            in_block_comment = True
            i += 2
            continue
        if ch in ('"', "'", "`"):
            in_str = ch
            str_start_line = line
            i += 1
            continue
        if ch == "/" and prev_token in regex_prev:
            regex_start_line = line
            i += 1
            in_char_class = False
            closed_regex = False
            while i < n and code[i] != "\n":
                rc = code[i]
                if rc == "\\":
                    if i + 1 < n and code[i + 1] == "\n":
                        break
                    i += 2
                    continue
                if rc == "[":
                    in_char_class = True
                elif rc == "]":
                    in_char_class = False
                elif rc == "/" and not in_char_class:
                    closed_regex = True
                    i += 1
                    while i < n and code[i].isalpha():
                        i += 1
                    break
                i += 1
            if not closed_regex:
                raise RuntimeError(f"[{filename}] 종료되지 않은 정규식 리터럴 (line {regex_start_line})")
            prev_token = "REGEX"
            continue
        if ch in ("(", "[", "{"):
            stack.append((ch, line))
            prev_token = ch
            i += 1
            continue
        if ch in (")", "]", "}"):
            if not stack:
                raise RuntimeError(f"[{filename}] 짝이 맞지 않는 닫는 괄호 {ch!r} (line {line})")
            open_ch, open_ln = stack.pop()
            expected = {"(": ")", "[": "]", "{": "}"}[open_ch]
            if ch != expected:
                raise RuntimeError(f"[{filename}] 괄호 불일치 {open_ch!r}(line {open_ln}) vs {ch!r}(line {line})")
            if ch == "}" and tmpl_brace_stack and len(stack) == tmpl_brace_stack[-1]:
                tmpl_brace_stack.pop()
                in_str = "`"
                str_start_line = line
            prev_token = ch
            i += 1
            continue
        if ch.isalnum() or ch in ("_", "$"):
            start = i
            while i < n and (code[i].isalnum() or code[i] in ("_", "$")):
                i += 1
            prev_token = code[start:i]
            continue
        if not ch.isspace():
            prev_token = ch
        i += 1
    if in_str:
        raise RuntimeError(f"[{filename}] 종료되지 않은 문자열 리터럴 {in_str!r} (EOF line {line})")
    if stack:
        raise RuntimeError(f"[{filename}] 닫히지 않은 괄호 존재: {stack[-3:]}")


FROZEN_BASELINE_IDS = ["accentColorPicker", "appBottomFooter", "appTopHeader", "audioFileUploader", "autoPlayIntervalInput", "autoPlayKioskToggleBtn", "autoSaveStatusText", "autosaveRecoveryBanner", "autosaveRecoveryMeta", "bgImageUploader", "blurAmountLabel", "blurRangeSlider", "bottomFooterBgPicker", "bottomFooterTextPicker", "cardBgColorPicker", "cardBgOpacityLabel", "cardBgOpacitySlider", "cardLinkedResizeToggle", "cardMediaSizeLabel", "cardMediaSizeSlider", "chartCellFillColorPicker", "chartCellTextColorPicker", "chartInsertTargetSelect", "chartItemsEditorList", "chartLegendPosSelect", "chartPrefixInput", "chartSuffixInput", "chartSyncAccentCheckbox", "csvPasteImportPanel", "csvPasteTextarea", "ctxAspectRatioSelect", "ctxBar-chart", "ctxBar-default", "ctxBar-media", "ctxBar-shape", "ctxBar-text", "ctxMenuGroupLabel", "ctxMenuLockLabel", "ctxMenuPasteBtn", "currentSlideNum", "currentTransitionBadge", "deckAspectRatioSelect", "directMediaUploader", "elHoverBgColorPicker", "elementAspectLockBtn", "elementBuildOrderInput", "elementOpacityLabel", "elementOpacitySlider", "exportFileNameInput", "fcBgBlurLabel", "fcBgBlurSlider", "fcBgColorInput", "fcBgOpacityInput", "fcBorderColorInput", "fcBorderFxColorInput", "fcBorderFxToggle", "fcBorderFxWidthInput", "fcBorderWidthSelect", "fcCustomCoordsWrap", "fcCustomHeightInput", "fcCustomWidthInput", "fcEditorBgPreviewLayer", "fcEditorBgTintLayer", "fcEditorDialogPanel", "fcEditorHoverBgPreviewLayer", "fcFxBasisSelect", "fcHoverBgBlurLabel", "fcHoverBgBlurSlider", "fcHoverBgColorInput", "fcHoverBgOpacityInput", "fcPosXInput", "fcPosYInput", "fcPositionPresetSelect", "fcPreviewResizeBox", "fcRadiusSelect", "fcReactiveFxSelect", "fcRedoBtn", "fcRichBodyEditor", "fcShadowColorInput", "fcShadowOpacityInput", "fcShadowToggle", "fcStudioTab-motion", "fcStudioTab-style", "fcTextColorInput", "fcTitleInput", "fcUndoBtn", "fcUseWidthPresetToggle", "fcWidthSelect", "filmstripCollapseBtn", "findCaseSensitiveChk", "findMatchCountBadge", "findMatchResultsList", "findQueryInput", "findReplaceModal", "floatingCardEditorModal", "floatingCardLightbox", "floatingCardLightboxBody", "floatingCardLightboxContent", "floatingCardMultiModeSelect", "floatingCardSelect", "fmtAlignCenterBtn", "fmtAlignJustifyBtn", "fmtAlignLeftBtn", "fmtAlignRightBtn", "fmtBoldBtn", "fmtItalicBtn", "fmtStrikeBtn", "fmtSubBtn", "fmtSupBtn", "fmtUnderlineBtn", "fontFamilySelect", "fontSizeInput", "formatPainterBtn", "fxBorderColorPicker", "fxBorderToggle", "fxBorderWidthLabel", "fxBorderWidthSlider", "fxShadowColorPicker", "fxShadowOpacityLabel", "fxShadowOpacitySlider", "fxShadowToggle", "generalAnimDelayInput", "globalImageUploader", "globalMediaUploader", "gradAlphaEnd", "gradAlphaMid", "gradAlphaStart", "gradAngleLabel", "gradAngleSlider", "gradColorEnd", "gradColorMid", "gradColorStart", "gradPreviewBar", "gradUseMid", "headerCommentCountBadge", "headerDeckSubtitle", "headerDeckTitle", "headerSectionBadge", "headerSlideCounterPill", "highlightColorPicker", "historyDropdownMenu", "historyDropdownWrap", "hoverBgOpacityLabel", "hoverBgOpacitySlider", "imgBrightnessSlider", "imgContrastSlider", "imgCropZoomLabel", "imgCropZoomSlider", "imgGrayscaleSlider", "imgPanXSlider", "imgPanYSlider", "inlineTextLinkBar", "inlineTextLinkInput", "innerMediaScaleLabel", "innerMediaScaleSlider", "insertCardFreeModeCheckbox", "insertIntoCardCheckbox", "inspH", "inspPaddingPx", "inspPxH", "inspPxW", "inspW", "inspX", "inspY", "leftFilmstripList", "letterSpacingInput", "lineHeightInput", "linkActionTypeSelect", "linkFloatingCardWrap", "linkSlideTargetInput", "linkSlideTargetWrap", "linkTriggerTargetWrap", "linkUrlTargetInput", "linkUrlTargetWrap", "linkedFloatingCardsList", "masterFooterTextInput", "masterHeaderLogoInput", "masterShowPageNumChk", "masterSkipCoverChk", "modalSlideGrid", "newSlideLayoutSelect", "onboardingGuideModal", "ovDetachBtn", "ovDragHandle", "ovMultiCountBadge", "ovSelectParentCardBtn", "overflowAuditList", "overflowAuditModal", "paraMarginBottomInput", "paraMarginTopInput", "pasteboardToggleBtn", "pickTriggerTargetBtn", "popoutFcStudioBtn", "popoutStudioBtn", "pptContextMenu", "pptContextualTopBar", "pptDrawCanvas", "pptDrawToolbar", "pptFloatingCardsStore", "pptLeftFilmstrip", "pptMarqueeBox", "pptOverlayPill", "pptRulerLeft", "pptRulerTop", "pptScreenBlackoutOverlay", "pptSelectionOverlay", "pptSmartGuidesLayer", "pptStudioDragHeader", "pptStudioPopup", "pptTailwindSafelist", "pptWorkspaceShell", "pptxFileImporter", "progressBarContainer", "progressBarFill", "projectFileImporter", "recoverPrevCrashBtn", "redoBtn", "replaceFontFromSelect", "replaceFontToSelect", "replaceMediaUploader", "replaceQueryInput", "reuseSlidesFileImporter", "reuseSlidesList", "reuseSlidesModal", "saveChoiceModal", "savedProjectsList", "shapeRadiusNumberInput", "shapeRadiusRangeSlider", "shortcutsHelpModal", "slideBgColorPicker", "slideBgOpacitySlider", "slideBgPicker", "slideBuildCountBadge", "slideCommentAuthorInput", "slideCommentTextInput", "slideCommentsList", "slideCommentsModal", "slideCommentsModalTitle", "slideHideToggleBtn", "slideLockToggleBtn", "slideSorterGrid", "slideSorterModal", "slideStage", "smartSnapToggleCheckbox", "speakerNotesTextarea", "spellcheckToggleBtn", "stageRulerToggleBtn", "stageZoomLabel", "startConnectorBtn", "starterTemplateModal", "studioCompactToggleBtn", "studioLayerList", "studioTab-arrange", "studioTab-deck", "studioTab-design", "studioTab-motion", "tableCellHeightInput", "tableCellWidthInput", "tblFirstColToggleBtn", "tblHeaderToggleBtn", "tblZebraToggleBtn", "textAutoFitToggleBtn", "textCharCountBadge", "textColorPicker", "textOffsetXInput", "textOffsetYInput", "textPillBgOpacityLabel", "textPillBgOpacitySlider", "textPillBgPicker", "textPillColorPicker", "textPillRadiusSlider", "textShadowColorPicker", "textShadowPresetSelect", "textStrokeColorPicker", "textStrokeWidthInput", "textboxAutoWidthBtn", "toastBox", "tocModal", "tocTabAllBtn", "tocTabSyncedBtn", "topHeaderBgPicker", "topHeaderTextPicker", "totalSlideNum", "triggerReactionSelect", "triggerTargetSelect", "undoBtn", "unifiedBgTargetSelect", "unifiedCardTypeSelect", "vidOptAutoplayBtn", "vidOptLoopBtn", "vidOptMutedBtn", "vidPosterStatusBadge", "videoPosterUploader", "videoSourcePathInput", "webEmbedUrlInput", "wordBreakToggleBtn", "workspaceStorageInfo"]
FROZEN_BASELINE_UI_HANDLERS = ["data-on-change::applyChartCellFillColor(this.value, false)", "data-on-change::applyChartCellTextColor(this.value, false)", "data-on-change::applyChromeBarColors('footer', 'bg', this.value, false)", "data-on-change::applyChromeBarColors('footer', 'fg', this.value, false)", "data-on-change::applyChromeBarColors('header', 'bg', this.value, false)", "data-on-change::applyChromeBarColors('header', 'fg', this.value, false)", "data-on-change::applyCustomSlideBg(this.value, false)", "data-on-change::applyElementPaddingPx(this.value)", "data-on-change::applyFontFamily(this.value)", "data-on-change::applyHighlightSelection(this.value, false)", "data-on-change::applyInspectorGeometry()", "data-on-change::applyInspectorPixelGeometry()", "data-on-change::applyLetterSpacing(this.value, false)", "data-on-change::applyLineHeight(this.value, false)", "data-on-change::applyLinkActionToSelected()", "data-on-change::applyReactiveBorderSettings()", "data-on-change::applyReactiveBorderSettings(false)", "data-on-change::applyReactiveShadowSettings()", "data-on-change::applyReactiveShadowSettings(false)", "data-on-change::applySelectedCardBgColor(this.value, false)", "data-on-change::applySelectedCardBgOpacity(this.value, false)", "data-on-change::applySelectedCardHoverBgColor(this.value, false)", "data-on-change::applySelectedHoverBgOpacity(this.value, false)", "data-on-change::applySelectedTableCellDimension('height', this.value)", "data-on-change::applySelectedTableCellDimension('width', this.value)", "data-on-change::applyTextColor(this.value, false)", "data-on-change::applyTextShadowPreset($studio('textShadowPresetSelect')?.value || 'soft', false)", "data-on-change::applyTextShadowPreset(this.value, false)", "data-on-change::applyTextStrokeStyle(false)", "data-on-change::applyVideoSourcePathFromStudio()", "data-on-change::onFcPositionPresetChange(this.value); recordFcSnapshot()", "data-on-change::onFcWidthPresetToggle(this.checked); recordFcSnapshot()", "data-on-change::onLinkActionTypeChange(this.value)", "data-on-change::previewAndApplyGradient(); saveHistorySnapshot('그라데이션 중간색')", "data-on-change::recordFcSnapshot()", "data-on-change::runSlideFindSearch()", "data-on-change::saveHistorySnapshot('그라데이션 각도')", "data-on-change::saveHistorySnapshot('그라데이션 적용')", "data-on-change::saveHistorySnapshot('블러 효과 적용')", "data-on-change::saveHistorySnapshot()", "data-on-change::setAccentColor(this.value, false)", "data-on-change::setBackgroundFitMode(this.value)", "data-on-change::setBackgroundFocalPosition(this.value)", "data-on-change::setChartLegendPosition(this.value)", "data-on-change::setChartValueAffix('prefix', this.value)", "data-on-change::setChartValueAffix('suffix', this.value)", "data-on-change::setDeckAspectRatio(this.value)", "data-on-change::setElementBuildOrder(this.value)", "data-on-change::setGeneralAnimationDelay(this.value)", "data-on-change::setInnerMediaScale(this.value, false)", "data-on-change::setParagraphSpacing('bottom', this.value, false)", "data-on-change::setParagraphSpacing('top', this.value, false)", "data-on-change::setSelectedElementOpacity(this.value, false)", "data-on-change::setSelectedElementRadiusPx(this.value)", "data-on-change::setSelectedElementRadiusPx(this.value, false)", "data-on-change::setSelectedFloatingCardDisplayMode(this.value)", "data-on-change::setSelectedFontSizePx(this.value, false)", "data-on-change::setSelectedImageCropAndPan('panX', this.value, false)", "data-on-change::setSelectedImageCropAndPan('panY', this.value, false)", "data-on-change::setSelectedImageCropAndPan('zoom', this.value, false)", "data-on-change::setSelectedImageFilter('brightness', this.value, false)", "data-on-change::setSelectedImageFilter('contrast', this.value, false)", "data-on-change::setSelectedImageFilter('grayscale', this.value, false)", "data-on-change::setSelectedTextOffsetFromInput()", "data-on-change::toggleAutoSwitchInspectorTab(this.checked)", "data-on-change::toggleCardLinkedResize(this.checked)", "data-on-change::toggleChartAccentSync(this.checked)", "data-on-change::toggleSmartSnap(this.checked)", "data-on-change::updateCurrentSlideSpeakerNotes(this.value, false)", "data-on-change::updateFloatingCardPreviewStyle(); recordFcSnapshot()", "data-on-change::updateSelectedShapeStyle('arrowHead', this.value)", "data-on-change::updateSelectedShapeStyle('borderColor', this.value, false)", "data-on-change::updateSelectedShapeStyle('borderStyle', this.value)", "data-on-change::updateSelectedShapeStyle('borderWidth', this.value)", "data-on-change::updateSelectedShapeStyle('fill', this.value, false)", "data-on-click::addCardToCurrentSlide('text')", "data-on-click::addFloatingCardLinkToSelected()", "data-on-click::addHierarchyTierToCard()", "data-on-click::addPersistentGuide('x')", "data-on-click::addPersistentGuide('y')", "data-on-click::addSlideReviewComment()", "data-on-click::addSlideWithLayout()", "data-on-click::addSubBoxToSelectedCard()", "data-on-click::addTextBoxToSelectedCard()", "data-on-click::addWideBoxToSelectedCard()", "data-on-click::adjustStageZoom(-10)", "data-on-click::adjustStageZoom(10)", "data-on-click::alignSelectedElements('bottom')", "data-on-click::alignSelectedElements('center-x')", "data-on-click::alignSelectedElements('center-y')", "data-on-click::alignSelectedElements('left')", "data-on-click::alignSelectedElements('right')", "data-on-click::alignSelectedElements('top')", "data-on-click::appendTableSummaryRow('avg')", "data-on-click::appendTableSummaryRow('sum')", "data-on-click::applyCardHoverToAll()", "data-on-click::applyChromeBarPreset('#111111', '#F9FAFB')", "data-on-click::applyChromeBarPreset('#F5F5F7', '#111111')", "data-on-click::applyCsvPasteToChartOrTable()", "data-on-click::applyGeneralAnimationToSelected('blur-in')", "data-on-click::applyGeneralAnimationToSelected('bounce-in')", "data-on-click::applyGeneralAnimationToSelected('fade-in')", "data-on-click::applyGeneralAnimationToSelected('fade-up')", "data-on-click::applyGeneralAnimationToSelected('flip-in')", "data-on-click::applyGeneralAnimationToSelected('float-loop')", "data-on-click::applyGeneralAnimationToSelected('none')", "data-on-click::applyGeneralAnimationToSelected('pulse-loop')", "data-on-click::applyGeneralAnimationToSelected('rotate-in')", "data-on-click::applyGeneralAnimationToSelected('shake-attention')", "data-on-click::applyGeneralAnimationToSelected('slide-down')", "data-on-click::applyGeneralAnimationToSelected('slide-left')", "data-on-click::applyGeneralAnimationToSelected('slide-right')", "data-on-click::applyGeneralAnimationToSelected('zoom-in')", "data-on-click::applyGeneralAnimationToSelected('zoom-out')", "data-on-click::applyLinkActionToSelected()", "data-on-click::applySlideMasterConfig()", "data-on-click::applySpotlightToSiblingGroup()", "data-on-click::applyStarterTemplate('blank')", "data-on-click::applyStarterTemplate('portfolio')", "data-on-click::applyStarterTemplate('proposal')", "data-on-click::applyStarterTemplate('report')", "data-on-click::applyThemePreset('dark')", "data-on-click::applyThemePreset('light')", "data-on-click::applyTransitionToAllSlides()", "data-on-click::applyVideoSourcePathFromStudio()", "data-on-click::centerSelectedOnSlide()", "data-on-click::changeSelectedLayerOrder('back')", "data-on-click::changeSelectedLayerOrder('down')", "data-on-click::changeSelectedLayerOrder('front')", "data-on-click::changeSelectedLayerOrder('up')", "data-on-click::clearAppliedGradient()", "data-on-click::clearFloatingCardBgImage()", "data-on-click::clearFloatingCardHoverBgImage()", "data-on-click::clearScreenDrawing(false)", "data-on-click::clearSlideBuildOrders()", "data-on-click::clearSlideMasterConfig()", "data-on-click::clearUnifiedBackgroundImage()", "data-on-click::closeFindReplaceModal()", "data-on-click::closeFloatingCardEditor()", "data-on-click::closeOnboardingGuide(false)", "data-on-click::closeOnboardingGuide(false); openStarterTemplateModal()", "data-on-click::closeOnboardingGuide(true)", "data-on-click::closeOverflowAuditModal()", "data-on-click::closeReuseSlidesModal()", "data-on-click::closeSaveModal()", "data-on-click::closeSaveModal(); exportDeckAsPPTX()", "data-on-click::closeSaveModal(); exportDeckAsZipPackage(false)", "data-on-click::closeSaveModal(); exportProjectJsonFile()", "data-on-click::closeSaveModal(); exportSlideOrElementAsImage('selected', 'png')", "data-on-click::closeSaveModal(); exportSlideOrElementAsImage('slide', 'jpg')", "data-on-click::closeSaveModal(); exportSlideOrElementAsImage('slide', 'png')", "data-on-click::closeSaveModal(); openOverflowAuditModal();", "data-on-click::closeSaveModal(); saveAsPDF(false)", "data-on-click::closeSaveModal(); saveAsPDF(true)", "data-on-click::closeSaveModal(); saveCurrentProjectToWorkspace()", "data-on-click::closeSaveModal(); saveModifiedHTML(false)", "data-on-click::closeSaveModal(); saveModifiedHTML(true)", "data-on-click::closeSaveModal(); triggerImportProjectFile()", "data-on-click::closeSlideCommentsPanel()", "data-on-click::closeSlideSorterModal()", "data-on-click::closeStageContextMenu(); changeSelectedLayerOrder('back')", "data-on-click::closeStageContextMenu(); changeSelectedLayerOrder('front')", "data-on-click::closeStageContextMenu(); copySelectedElements()", "data-on-click::closeStageContextMenu(); deleteSelectedElement()", "data-on-click::closeStageContextMenu(); duplicateSelectedElement()", "data-on-click::closeStageContextMenu(); if(selectedElement && selectedElement.getAttribute('data-group-id')) ungroupSelectedElements(); else groupSelectedElements();", "data-on-click::closeStageContextMenu(); pasteCopiedElements(true)", "data-on-click::closeStageContextMenu(); toggleContextTargetLock()", "data-on-click::closeStarterTemplateModal()", "data-on-click::const m=document.getElementById('pptContextMenu'); const x=Number(m?.dataset.spawnX||0), y=Number(m?.dataset.spawnY||0); closeStageContextMenu(); insertFreeTextboxAtClientPoint(x, y);", "data-on-click::const t=$studio('unifiedCardTypeSelect')?.value||'text'; if(t==='title') addTitleCardToCurrentSlide(); else addCardToCurrentSlide(t);", "data-on-click::copyCurrentSlideToClipboard()", "data-on-click::copySelectedElements()", "data-on-click::createNewPresentationProject()", "data-on-click::deleteSelectedElement()", "data-on-click::deleteSelectedFilmstripSlides()", "data-on-click::deleteSelectedFloatingCard()", "data-on-click::detachSelectedToFreeCanvas()", "data-on-click::discardAutoSave()", "data-on-click::distributeSelectedElements('horizontal')", "data-on-click::distributeSelectedElements('vertical')", "data-on-click::duplicateSelectedElement()", "data-on-click::duplicateSelectedFilmstripSlides()", "data-on-click::editSelectedFloatingCard()", "data-on-click::equalizeTableColWidths()", "data-on-click::equalizeTableRowHeights()", "data-on-click::exportProjectPackageZip()", "data-on-click::fcRedoAction()", "data-on-click::fcUndoAction()", "data-on-click::findNextMatch()", "data-on-click::groupSelectedElements()", "data-on-click::if(event.target===this) closeFindReplaceModal()", "data-on-click::if(event.target===this) closeFloatingCardLightbox()", "data-on-click::if(event.target===this) closeOnboardingGuide(false)", "data-on-click::if(event.target===this) closeOverflowAuditModal()", "data-on-click::if(event.target===this) closeReuseSlidesModal()", "data-on-click::if(event.target===this) closeSaveModal()", "data-on-click::if(event.target===this) closeSlideCommentsPanel()", "data-on-click::if(event.target===this) closeSlideSorterModal()", "data-on-click::if(event.target===this) closeStarterTemplateModal()", "data-on-click::if(event.target===this) toggleShortcutsHelpModal()", "data-on-click::if(event.target===this) toggleTocModal()", "data-on-click::importSelectedSlidesFromModal()", "data-on-click::insertChartOrTable('bar-h', 'auto')", "data-on-click::insertChartOrTable('bar-v', 'auto')", "data-on-click::insertChartOrTable('donut', 'auto')", "data-on-click::insertChartOrTable('kpi', 'auto')", "data-on-click::insertChartOrTable('line', 'auto')", "data-on-click::insertChartOrTable('table', 'auto')", "data-on-click::insertFreeShape('arrowRight')", "data-on-click::insertFreeShape('circle')", "data-on-click::insertFreeShape('diamond')", "data-on-click::insertFreeShape('line')", "data-on-click::insertFreeShape('pill')", "data-on-click::insertFreeShape('roundRect')", "data-on-click::insertFreeShape('speech')", "data-on-click::insertFreeShape('star')", "data-on-click::insertFreeShape('textbox')", "data-on-click::insertFreeShape('triangle')", "data-on-click::insertFreeSvgIcon('alert')", "data-on-click::insertFreeSvgIcon('bolt')", "data-on-click::insertFreeSvgIcon('chart')", "data-on-click::insertFreeSvgIcon('check')", "data-on-click::insertFreeSvgIcon('heart')", "data-on-click::insertFreeSvgIcon('pin')", "data-on-click::insertFreeSvgIcon('play')", "data-on-click::insertFreeSvgIcon('rocket')", "data-on-click::insertFreeSvgIcon('star')", "data-on-click::insertFreeSvgIcon('user')", "data-on-click::insertFreeTextboxAtClientPoint()", "data-on-click::insertInteractiveLinkButton()", "data-on-click::insertInteractiveTriggerButton()", "data-on-click::insertSlideNumberToken()", "data-on-click::insertTableColAt(0)", "data-on-click::insertTableColAt(1)", "data-on-click::insertTableRowAt(0)", "data-on-click::insertTableRowAt(1)", "data-on-click::insertWebEmbedWidget()", "data-on-click::matchSelectedElementsSize('both')", "data-on-click::matchSelectedElementsSize('height')", "data-on-click::matchSelectedElementsSize('width')", "data-on-click::mergeSelectedTableCells()", "data-on-click::nextSlide()", "data-on-click::nudgeSelectedPosition(-8, 0)", "data-on-click::nudgeSelectedPosition(0, -8)", "data-on-click::nudgeSelectedPosition(0, 8)", "data-on-click::nudgeSelectedPosition(8, 0)", "data-on-click::openExternalFloatingCardWindow()", "data-on-click::openExternalStudioWindow()", "data-on-click::openFindReplaceModal(false)", "data-on-click::openFloatingCardEditor(null)", "data-on-click::openPresenterViewWindow()", "data-on-click::openSaveModal()", "data-on-click::openSlideCommentsPanel()", "data-on-click::openSlidePageJumpInput()", "data-on-click::openSlideSorterModal()", "data-on-click::pasteCopiedElements(true)", "data-on-click::pasteCopiedSlide()", "data-on-click::prevSlide()", "data-on-click::previewCurrentSlideTransition()", "data-on-click::recoverFromAutoSave('latest')", "data-on-click::recoverFromAutoSave('prev')", "data-on-click::redoAction()", "data-on-click::removeSelectedTableCol()", "data-on-click::removeSelectedTableRow()", "data-on-click::replaceAllFindMatches()", "data-on-click::replaceCurrentFindMatch()", "data-on-click::replaceFontAcrossDeck()", "data-on-click::resetCurrentSlideToInitial()", "data-on-click::resetEntireDeckToInitial()", "data-on-click::resetFloatingCardEditorStyle()", "data-on-click::resetSelectedImageAdjustments()", "data-on-click::resetSelectedImageAspectRatio()", "data-on-click::resetStageZoomAndPan()", "data-on-click::saveCurrentProjectToWorkspace()", "data-on-click::saveFloatingCardFromEditor()", "data-on-click::selectParentCardFromChild()", "data-on-click::setElementBuildOrder(1)", "data-on-click::setElementBuildOrder(2)", "data-on-click::setElementBuildOrder(3)", "data-on-click::setFloatingCardBgImage()", "data-on-click::setFloatingCardHoverBgImage()", "data-on-click::setGradientMode('fill')", "data-on-click::setGradientMode('mask')", "data-on-click::setReactiveFxBasis('box')", "data-on-click::setReactiveFxBasis('content')", "data-on-click::setScreenDrawColor('#0055FF')", "data-on-click::setScreenDrawColor('#EF4444')", "data-on-click::setScreenDrawColor('#FFE600')", "data-on-click::setSlideLayout('1col')", "data-on-click::setSlideLayout('2col-equal')", "data-on-click::setSlideLayout('2col-left')", "data-on-click::setSlideLayout('2col-right')", "data-on-click::setSlideLayout('3col')", "data-on-click::setSlideTransition('fade')", "data-on-click::setSlideTransition('flip')", "data-on-click::setSlideTransition('none')", "data-on-click::setSlideTransition('slide-left')", "data-on-click::setSlideTransition('slide-up')", "data-on-click::setSlideTransition('zoom')", "data-on-click::setTextVerticalAlign('bottom')", "data-on-click::setTextVerticalAlign('middle')", "data-on-click::setTextVerticalAlign('top')", "data-on-click::setTocModalMode('all')", "data-on-click::setTocModalMode('synced')", "data-on-click::sortTableBySelectedColumn('asc')", "data-on-click::splitSelectedTableCell()", "data-on-click::startBlankUniversalDeck()", "data-on-click::startConnectorLinkMode()", "data-on-click::startPickTriggerTargetMode()", "data-on-click::switchFcStudioTab('motion')", "data-on-click::switchFcStudioTab('style')", "data-on-click::switchStudioTab('arrange')", "data-on-click::switchStudioTab('deck')", "data-on-click::switchStudioTab('design')", "data-on-click::switchStudioTab('motion')", "data-on-click::toggleAutoPlayKiosk()", "data-on-click::toggleCsvPastePanel()", "data-on-click::toggleCurrentSlideHidden()", "data-on-click::toggleCurrentSlideLock()", "data-on-click::toggleEditMode(false)", "data-on-click::toggleElementAspectLock()", "data-on-click::toggleFcDialogMaximize()", "data-on-click::toggleFullScreen()", "data-on-click::toggleHistoryDropdown()", "data-on-click::toggleLeftFilmstrip()", "data-on-click::togglePasteboardMode()", "data-on-click::toggleScreenBlackout(activeScreenBlackoutMode)", "data-on-click::toggleScreenDrawMode(false)", "data-on-click::toggleSelectedImageFlip('x')", "data-on-click::toggleSelectedImageFlip('y')", "data-on-click::toggleSelectedShapeShadow()", "data-on-click::toggleShortcutsHelpModal()", "data-on-click::toggleSpellcheckMode()", "data-on-click::toggleStageRulers()", "data-on-click::toggleStudioCompactMode()", "data-on-click::toggleStudioMinimize()", "data-on-click::toggleTableOption('firstCol')", "data-on-click::toggleTableOption('header')", "data-on-click::toggleTableOption('zebra')", "data-on-click::toggleTextAutoFit()", "data-on-click::toggleTextboxAutoWidth()", "data-on-click::toggleTocModal()", "data-on-click::toggleVideoPlaybackOption('autoplay')", "data-on-click::toggleVideoPlaybackOption('loop')", "data-on-click::toggleVideoPlaybackOption('muted')", "data-on-click::toggleWordBreakMode()", "data-on-click::triggerAudioInsert()", "data-on-click::triggerDirectMediaInsert()", "data-on-click::triggerImportPptxFile()", "data-on-click::triggerImportProjectFile()", "data-on-click::triggerReplaceMediaPreserveProps()", "data-on-click::triggerReuseSlidesImport()", "data-on-click::triggerUnifiedBackgroundUpload()", "data-on-click::triggerVideoPosterUpload()", "data-on-click::undoAction()", "data-on-click::ungroupSelectedElements()", "data-on-click::unlockAllLayersInSlide()", "data-on-input::applyChartCellFillColor(this.value, true)", "data-on-input::applyChartCellTextColor(this.value, true)", "data-on-input::applyChromeBarColors('footer', 'bg', this.value, true)", "data-on-input::applyChromeBarColors('footer', 'fg', this.value, true)", "data-on-input::applyChromeBarColors('header', 'bg', this.value, true)", "data-on-input::applyChromeBarColors('header', 'fg', this.value, true)", "data-on-input::applyCustomSlideBg(this.value, true)", "data-on-input::applyHighlightSelection(this.value, true)", "data-on-input::applyLetterSpacing(this.value, true)", "data-on-input::applyLineHeight(this.value, true)", "data-on-input::applyReactiveBorderSettings(true)", "data-on-input::applyReactiveShadowSettings(true)", "data-on-input::applySelectedCardBgColor(this.value, true)", "data-on-input::applySelectedCardBgOpacity(this.value, true)", "data-on-input::applySelectedCardHoverBgColor(this.value, true)", "data-on-input::applySelectedHoverBgOpacity(this.value, true)", "data-on-input::applyTextColor(this.value, true)", "data-on-input::applyTextStrokeStyle(true)", "data-on-input::onBlurSliderChange(this.value)", "data-on-input::onFcBgBlurChange(this.value)", "data-on-input::onFcCustomSizeInput()", "data-on-input::onFcHoverBgBlurChange(this.value)", "data-on-input::previewAndApplyGradient()", "data-on-input::runSlideFindSearch()", "data-on-input::setAccentColor(this.value, true)", "data-on-input::setCardMediaSizeValue(this.value)", "data-on-input::setGradientAngle(this.value)", "data-on-input::setInnerMediaScale(this.value, true)", "data-on-input::setParagraphSpacing('bottom', this.value, true)", "data-on-input::setParagraphSpacing('top', this.value, true)", "data-on-input::setSelectedElementOpacity(this.value, true)", "data-on-input::setSelectedElementRadiusPx(this.value, true)", "data-on-input::setSelectedFontSizePx(this.value, true)", "data-on-input::setSelectedImageCropAndPan('panX', this.value, true)", "data-on-input::setSelectedImageCropAndPan('panY', this.value, true)", "data-on-input::setSelectedImageCropAndPan('zoom', this.value, true)", "data-on-input::setSelectedImageFilter('brightness', this.value, true)", "data-on-input::setSelectedImageFilter('contrast', this.value, true)", "data-on-input::setSelectedImageFilter('grayscale', this.value, true)", "data-on-input::updateCurrentSlideSpeakerNotes(this.value, true)", "data-on-input::updateFloatingCardPreviewStyle()", "data-on-input::updateSelectedShapeStyle('borderColor', this.value, true)", "data-on-input::updateSelectedShapeStyle('fill', this.value, true)", "data-on-input::updateTextPillLiveBgOpacity()", "data-on-input::updateTextPillLiveBgOpacity(this.value)", "data-on-input::updateTextPillLiveRadius(this.value)", "data-on-input::updateTextPillLiveTextColor(this.value)", "data-on-keydown::if(event.key==='Enter'){event.preventDefault(); addSlideReviewComment();}", "data-on-keydown::if(event.key==='Enter'){event.preventDefault(); findNextMatch();}", "data-on-keydown::if(event.key==='Enter'){event.preventDefault(); replaceCurrentFindMatch();}", "data-on-keydown::if(event.key==='Enter'){event.preventDefault(); setSelectedFontSizePx(this.value, false);}", "data-on-keydown::if(event.key==='Enter'){event.preventDefault();insertWebEmbedWidget();}", "data-on-mousedown::event.preventDefault(); adjustListIndent(-1)", "data-on-mousedown::event.preventDefault(); adjustListIndent(1)", "data-on-mousedown::event.preventDefault(); adjustSelectedFontSize(-1)", "data-on-mousedown::event.preventDefault(); adjustSelectedFontSize(-2)", "data-on-mousedown::event.preventDefault(); adjustSelectedFontSize(1)", "data-on-mousedown::event.preventDefault(); adjustSelectedFontSize(2)", "data-on-mousedown::event.preventDefault(); applyHighlightSelection()", "data-on-mousedown::event.preventDefault(); applyInlineTextLink()", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('click-flip')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('click-pulse')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-float')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-glow')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-lift')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-rotate')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-shake')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-spotlight')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-tilt')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('hover-zoom')", "data-on-mousedown::event.preventDefault(); applyReactiveEffectToSelected('none')", "data-on-mousedown::event.preventDefault(); applyTextBackgroundBox()", "data-on-mousedown::event.preventDefault(); designateCoreKeyword()", "data-on-mousedown::event.preventDefault(); execFormat('bold')", "data-on-mousedown::event.preventDefault(); execFormat('italic')", "data-on-mousedown::event.preventDefault(); execFormat('justifyCenter')", "data-on-mousedown::event.preventDefault(); execFormat('justifyFull')", "data-on-mousedown::event.preventDefault(); execFormat('justifyLeft')", "data-on-mousedown::event.preventDefault(); execFormat('justifyRight')", "data-on-mousedown::event.preventDefault(); execFormat('strikeThrough')", "data-on-mousedown::event.preventDefault(); execFormat('underline')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('※')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('→')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('↗')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('◆')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('●')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('★')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('✓')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('✕')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('🎯')", "data-on-mousedown::event.preventDefault(); insertSymbolAtCursor('💡')", "data-on-mousedown::event.preventDefault(); pickColorWithEyeDropper('fill')", "data-on-mousedown::event.preventDefault(); pickColorWithEyeDropper('text')", "data-on-mousedown::event.preventDefault(); reapplyCurrentTextColor()", "data-on-mousedown::event.preventDefault(); removeCoreKeyword()", "data-on-mousedown::event.preventDefault(); removeInlineTextLink()", "data-on-mousedown::event.preventDefault(); resetCurrentContextStyle()", "data-on-mousedown::event.preventDefault(); toggleFormatPainter()", "data-on-mousedown::event.preventDefault(); toggleInlineTextLinkBar()", "data-on-mousedown::event.preventDefault(); toggleSubSup('subscript')", "data-on-mousedown::event.preventDefault(); toggleSubSup('superscript')", "data-on-mousedown::event.preventDefault(); toggleTextList('ol')", "data-on-mousedown::event.preventDefault(); toggleTextList('ul')", "data-on-mousedown::event.preventDefault(); transformSelectedTextCase('capitalize')", "data-on-mousedown::event.preventDefault(); transformSelectedTextCase('lower')", "data-on-mousedown::event.preventDefault(); transformSelectedTextCase('upper')", "data-on-mousedown::event.preventDefault(); unwrapActiveInlineFxSpan()", "data-on-mousedown::event.stopPropagation()", "data-on-mousedown::startFcPreviewResize(event, 'e')", "data-on-mousedown::startFcPreviewResize(event, 's')", "data-on-mousedown::startFcPreviewResize(event, 'se')", "data-on-mousedown::startProgressBarScrub(event, this)", "data-on-mousedown::startResizablePanelDrag(event, 'fcEditorDialogPanel', 'e')", "data-on-mousedown::startResizablePanelDrag(event, 'fcEditorDialogPanel', 's')", "data-on-mousedown::startResizablePanelDrag(event, 'fcEditorDialogPanel', 'se')", "data-on-mousedown::startResizablePanelDrag(event, 'fcEditorDialogPanel', 'sw')", "data-on-mousedown::startResizablePanelDrag(event, 'fcEditorDialogPanel', 'w')", "data-on-mousedown::startResizablePanelDrag(event, 'pptStudioPopup', 'e')", "data-on-mousedown::startResizablePanelDrag(event, 'pptStudioPopup', 's')", "data-on-mousedown::startResizablePanelDrag(event, 'pptStudioPopup', 'se')", "data-on-mousedown::startResizablePanelDrag(event, 'pptStudioPopup', 'sw')", "data-on-mousedown::startResizablePanelDrag(event, 'pptStudioPopup', 'w')"]

def verify_ui_invariance_contract(doc):
    cur_ids = set(doc.xpath("//@id"))
    missing_ids = [i for i in FROZEN_BASELINE_IDS if i not in cur_ids]
    if missing_ids:
        raise RuntimeError(f"UI 불변성 계약 위반 — 누락된 DOM ID ({len(missing_ids)}개): {missing_ids[:10]}")
    h_attrs = [
        "data-on-click", "data-on-input", "data-on-change", "data-on-mousedown",
        "data-on-keydown", "data-on-blur", "data-on-dragstart", "data-on-dragover",
        "data-on-dragleave", "data-on-drop"
    ]
    cur_handlers = set()
    for attr in h_attrs:
        for el in doc.xpath(f"//*[@{attr}]"):
            if el.xpath('ancestor::section[contains(@class, "slide")]'):
                continue
            cur_handlers.add(f"{attr}::{el.get(attr).strip()}")
    missing_h = [h for h in FROZEN_BASELINE_UI_HANDLERS if h not in cur_handlers]
    if missing_h:
        raise RuntimeError(f"UI 불변성 계약 위반 — 누락된 버튼/핸들러 ({len(missing_h)}개): {missing_h[:5]}")


def strip_js_comments_and_strings(code):
    out = []
    i, n = 0, len(code)
    in_str = None
    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            while i < n and code[i] != "\n":
                i += 1
            continue
        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (code[i] == "*" and code[i + 1] == "/"):
                i += 1
            i += 2
            continue
        if ch in ('"', "'", "`"):
            in_str = ch
            out.append(" ")
            i += 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)

def verify_strict_csp_compliance(html_str, js_files_map):
    doc = lxml_html.fromstring(html_str)
    for raw_on in ["onclick", "oninput", "onchange", "onmousedown", "onkeydown", "onblur", "ondragstart", "ondragover", "ondragleave", "ondrop"]:
        found = doc.xpath(f"//*[@{raw_on}]")
        if found:
            raise RuntimeError(f"CSP 위반: index.html에 인라인 {raw_on} 속성 {len(found)}건 존재")
    evt_names = "click|input|change|mousedown|mouseup|keydown|keyup|blur|focus|submit|load|error|dragstart|dragover|dragleave|drop"
    raw_on_attr_re = re.compile(rf'(?<![a-zA-Z0-9_-])on(?:{evt_names})\s*=\s*(?:"[^"]*"|\'[^\']*\')', re.I)
    raw_on_setattr_re = re.compile(rf"setAttribute\(\s*['\"]on(?:{evt_names})['\"]", re.I)
    for rel_js, src in js_files_map.items():
        stripped = strip_js_comments_and_strings(src)
        if re.search(r"\bnew\s+Function\s*\(", stripped):
            raise RuntimeError(f"CSP 위반(unsafe-eval): {rel_js}에 new Function() 사용 금지")
        if re.search(r"(?<![.\w$])\beval\s*\(", stripped):
            raise RuntimeError(f"CSP 위반(unsafe-eval): {rel_js}에 eval() 사용 금지")
        if re.search(r"(?<![.\w$])\bwith\s*\(", stripped):
            raise RuntimeError(f"CSP/Strict 위반: {rel_js}에 with() 문 사용 금지")
        if raw_on_attr_re.search(src) or raw_on_setattr_re.search(src):
            raise RuntimeError(f"CSP 위반(unsafe-inline): {rel_js}에 동적 인라인 on*= 이벤트 생성 금지 (data-on-* 사용 필수)")

def verify_static_integrity(html_str, js_sources):
    if "cdn.tailwindcss.com" in html_str:
        raise RuntimeError("index.html에 프로덕션 비권장 Tailwind Play CDN 스크립트가 남아 있습니다.")
    js_map = {}
    for rel_js in JS_FILES:
        with open(os.path.join(BASE_DIR, rel_js), "r", encoding="utf-8") as jf:
            src = jf.read()
            js_map[rel_js] = src
            verify_js_lexical_syntax(rel_js, src)
    sw_path = os.path.join(BASE_DIR, "sw.js")
    if os.path.exists(sw_path):
        with open(sw_path, "r", encoding="utf-8") as swf:
            sw_src = swf.read()
            verify_js_lexical_syntax("sw.js", sw_src)
            js_map["sw.js"] = sw_src
    verify_strict_csp_compliance(html_str, js_map)
    for aux_js in ["playwright.config.mjs", "tests/e2e.spec.mjs"]:
        aux_p = os.path.join(BASE_DIR, aux_js)
        if os.path.exists(aux_p):
            with open(aux_p, "r", encoding="utf-8") as af:
                verify_js_lexical_syntax(aux_js, af.read())
    pkg_p = os.path.join(BASE_DIR, "package.json")
    if os.path.exists(pkg_p):
        with open(pkg_p, "r", encoding="utf-8") as pf:
            json.load(pf)
    man_p = os.path.join(BASE_DIR, "manifest.webmanifest")
    if os.path.exists(man_p):
        with open(man_p, "r", encoding="utf-8") as mf:
            json.load(mf)
    csp_srv_p = os.path.join(BASE_DIR, "tests", "csp-server.py")
    if os.path.exists(csp_srv_p):
        import ast as _ast
        with open(csp_srv_p, "r", encoding="utf-8") as sf:
            _ast.parse(sf.read(), filename="tests/csp-server.py")
    doc = lxml_html.fromstring(html_str)
    verify_ui_invariance_contract(doc)
    all_ids = doc.xpath("//@id")
    dup_ids = {x for x in all_ids if all_ids.count(x) > 1}
    if dup_ids:
        raise RuntimeError(f"중복 DOM ID 발견: {dup_ids}")
    slides = doc.xpath('//*[contains(concat(" ", normalize-space(@class), " "), " slide ")]')
    for s in slides:
        if s.xpath(".//*[@id]"):
            raise RuntimeError("슬라이드(.slide) 내부에 id 속성이 존재합니다.")
    defined_fns = set()
    for src in js_sources:
        defined_fns.update(re.findall(r"(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(", src))
    builtins = {
        "event", "this", "window", "document", "Number", "String", "Boolean",
        "parseInt", "parseFloat", "Math", "Date", "Array", "Object", "JSON",
        "alert", "confirm", "prompt", "if", "else", "return", "typeof", "void",
        "setTimeout", "clearTimeout", "console", "$studio", "$fc"
    }
    handler_attrs = [
        "onclick", "oninput", "onchange", "onmousedown", "onkeydown", "onblur", "ondragstart", "ondragover", "ondragleave", "ondrop",
        "data-on-click", "data-on-input", "data-on-change", "data-on-mousedown", "data-on-keydown", "data-on-blur",
        "data-on-dragstart", "data-on-dragover", "data-on-dragleave", "data-on-drop"
    ]
    for attr in handler_attrs:
        for el in doc.xpath(f"//*[@{attr}]"):
            val = el.get(attr)
            for m in re.finditer(r"(?<![.\w$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(", val):
                fn = m.group(1)
                if fn not in builtins and fn not in defined_fns:
                    raise RuntimeError(f"미정의 이벤트 핸들러 발견: {fn}() in {attr}={val!r}")

def build_standalone():
    html, js_sources = generate_static_tailwind_css()
    sync_export_bundle()
    verify_static_integrity(html, js_sources)

    def replace_css(match):
        tag = match.group(0)
        href_m = re.search(r'href="(css/[^"]+)"', tag)
        if not href_m:
            return tag
        rel_path = href_m.group(1)
        full_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(full_path):
            return tag
        with open(full_path, "r", encoding="utf-8") as cf:
            css_content = cf.read()
        media_m = re.search(r'media="([^"]+)"', tag)
        media_attr = f' media="{media_m.group(1)}"' if media_m else ""
        return f'<style data-inlined-css="{rel_path}"{media_attr}>' + "\n" + css_content + "\n" + "</style>"

    standalone_html = re.sub(r'<link\b[^>]*rel="(?:manifest|icon|apple-touch-icon)"[^>]*>\s*', "", html)
    standalone_html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*>', replace_css, standalone_html)

    def replace_js(match):
        rel_path = match.group(1)
        if rel_path == "js/bundle-data.js":
            return ""
        full_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(full_path):
            return match.group(0)
        with open(full_path, "r", encoding="utf-8") as jf:
            js_content = jf.read()
        safe_js = js_content.replace("</script>", "<\\/script>").replace("</SCRIPT>", "<\\/SCRIPT>")
        return f'<script data-inlined-js="{rel_path}">' + "\n" + safe_js + "\n" + "</script>"

    standalone_html = re.sub(r'<script\b[^>]*src="(js/[^"]+)"[^>]*>\s*</script>', replace_js, standalone_html)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        out.write(standalone_html)
    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"빌드 완료: {OUTPUT_PATH} ({size_kb:.1f} KB)")

REQUIRED_PACKAGE_FILES = [
    "README.md",
    "index.html",
    "build.py",
    "manifest.webmanifest",
    "sw.js",
    "icons/icon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "css/tailwind.built.css",
    "css/base.css",
    "css/slides.css",
    "css/editor.css",
    "css/studio.css",
    "css/print.css",
    "js/state.js",
    "js/history.js",
    "js/storage.js",
    "js/navigation.js",
    "js/find-replace.js",
    "js/presenter-view.js",
    "js/filmstrip.js",
    "js/text-editor.js",
    "js/selection.js",
    "js/bento-grid.js",
    "js/media.js",
    "js/charts.js",
    "js/theme.js",
    "js/effects.js",
    "js/floating-cards.js",
    "js/widgets.js",
    "js/bundle-data.js",
    "js/export.js",
    "js/pwa-fs.js",
    "js/studio.js",
    "js/smart-guides.js",
    "js/main.js",
    "js/safe-events.js",
    "docs/CHANGELOG.md",
    "docs/PROJECT_GUIDE.md",
    "docs/ROADMAP_PROGRESS.md",
    ".gitignore",
    "package.json",
    "playwright.config.mjs",
    "tests/csp-server.py",
    "tests/e2e.spec.mjs",
    "tests/stress-and-compat.spec.mjs",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-pages.yml",
]

def create_verified_release_zip(out_dir="/mnt/data"):
    build_standalone()
    with open(os.path.join(BASE_DIR, "docs", "PROJECT_GUIDE.md"), "r", encoding="utf-8") as gf:
        m = re.search(r"`(v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)`", gf.read())
    ver = m.group(1) if m else "v4.5.3"
    os.makedirs(out_dir, exist_ok=True)
    zip_path = os.path.join(out_dir, f"HTML_Slide_Tool_{ver}.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zout:
        for rel in REQUIRED_PACKAGE_FILES:
            full_p = os.path.join(BASE_DIR, rel)
            if not os.path.exists(full_p):
                raise RuntimeError(f"배포 필수 파일 누락: {rel}")
            zout.write(full_p, f"HTML_Slide_Tool/{rel}")
    print(f"배포 패키지 생성 완료: {zip_path} ({len(REQUIRED_PACKAGE_FILES)}개 필수 파일 검증됨)")
    return zip_path

def run_automated_verification_suite():
    html, js_sources = generate_static_tailwind_css()
    sync_export_bundle()
    verify_static_integrity(html, js_sources)
    doc = lxml_html.fromstring(html)
    all_ids = doc.xpath("//@id")
    # 4-Way Manifest Parity Gate (index.html <-> build.py JS_FILES <-> sw.js APP_SHELL_ASSETS <-> REQUIRED_PACKAGE_FILES)
    html_js_order = [s for s in re.findall(r'<script\s+src="(js/[^"]+)"', html) if s != "js/bundle-data.js"]
    if html_js_order != JS_FILES:
        raise RuntimeError(f"index.html <script> 순서와 build.py JS_FILES 불일치: html={html_js_order} vs build={JS_FILES}")
    with open(os.path.join(BASE_DIR, "sw.js"), "r", encoding="utf-8") as swf:
        sw_assets = set(re.findall(r"'\./([^']+)'", swf.read()))
    for expected_asset in list(CSS_FILES) + list(JS_FILES) + ["js/bundle-data.js"]:
        if expected_asset not in sw_assets:
            raise RuntimeError(f"sw.js APP_SHELL_ASSETS 누락: {expected_asset}")
        if expected_asset not in REQUIRED_PACKAGE_FILES:
            raise RuntimeError(f"build.py REQUIRED_PACKAGE_FILES 누락: {expected_asset}")
    for spec_rel in ("tests/e2e.spec.mjs", "tests/stress-and-compat.spec.mjs"):
        spec_p = os.path.join(BASE_DIR, spec_rel)
        if os.path.exists(spec_p):
            with open(spec_p, "r", encoding="utf-8") as sf:
                verify_js_lexical_syntax(spec_rel, sf.read())
    for rel in REQUIRED_PACKAGE_FILES:
        if not os.path.exists(os.path.join(BASE_DIR, rel)):
            raise RuntimeError(f"필수 파일 누락: {rel}")
    print(f"[TEST SUITE PASSED] Strict-CSP(Zero-Eval/Zero-With/Zero-Inline-On) OK · Play CDN 0건 · 정적 Tailwind CSS 생성 OK · JS {len(JS_FILES)}개 구문/어휘 OK · DOM ID {len(all_ids)}개 유일성 OK · 필수 파일 {len(REQUIRED_PACKAGE_FILES)}개 OK")

if __name__ == "__main__":
    if "--test" in sys.argv:
        run_automated_verification_suite()
    elif "--package" in sys.argv:
        create_verified_release_zip()
    else:
        build_standalone()
