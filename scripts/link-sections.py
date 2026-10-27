"""Makes the concatenated document navigable in the PDF. build-pdf.sh writes a
`<!-- file: path -->` marker before each source file and a `<!-- toc -->` marker after the cover.
This script gives every heading of level 1 and 2 an anchor, turns each link to another source
file of the document into a link to that file's first heading (a link to a file left out of the
PDF becomes plain text), and replaces the toc marker with a table of contents.
Usage: python3 link-sections.py <file.md>   (the file is rewritten in place)"""
import html
import os
import re
import sys

FILE_MARKER = re.compile(r'^<!-- file: (.+) -->$')
HEADING = re.compile(r'^(#{1,2}) (.+)$')
PART_TITLE = re.compile(r'^<div class="part-title"><h1>(.+)</h1></div>$')
LINK = re.compile(r'\[([^]]*)\]\(([^)#]*\.md)(#[^)]*)?\)')

def toc_text(text):
    text = html.escape(re.sub(r'\*\*|__', '', text), quote=False)
    return re.sub(r'`([^`]*)`', r'<code>\1</code>', text)

path = sys.argv[1]
lines = open(path, encoding='utf-8').read().split('\n')

# First pass: anchor of each file (its first heading) and of each heading.
out, toc, file_anchor = [], [], {}
current, in_code, in_cover, toc_seen = None, False, True, False
for line in lines:
    marker = FILE_MARKER.match(line)
    if marker:
        current = marker.group(1)
        out.append(line)
        continue
    if line == '<!-- toc -->':
        toc_seen = True
    if line.lstrip().startswith('```'):
        in_code = not in_code
    heading = None if in_code or not toc_seen else HEADING.match(line)
    part = PART_TITLE.match(line) if toc_seen else None
    if heading or part:
        anchor = f'sec-{len(toc) + 1}'
        if heading:
            level, text = len(heading.group(1)), heading.group(2)
            line = f'{heading.group(1)} <a id="{anchor}"></a>{text}'
        else:
            level, text = 1, part.group(1)
            line = f'<div class="part-title"><h1 id="{anchor}">{text}</h1></div>'
        if current and current not in file_anchor:
            file_anchor[current] = anchor
        toc.append((level, text, anchor))
    out.append(line)

# Second pass: links between files, markers, table of contents.
result, current = [], None
for line in out:
    marker = FILE_MARKER.match(line)
    if marker:
        current = marker.group(1)
        continue
    if line == '<!-- toc -->':
        result.append('<nav class="toc"><h1>Contents</h1><ul>')
        for level, text, anchor in toc:
            result.append(f'<li class="toc-{level}"><a href="#{anchor}">{toc_text(text)}</a></li>')
        result.append('</ul></nav>')
        continue

    def relink(match):
        target = os.path.normpath(os.path.join(os.path.dirname(current or ''), match.group(2)))
        anchor = file_anchor.get(target)
        return f'[{match.group(1)}](#{anchor})' if anchor else match.group(1)

    result.append(LINK.sub(relink, line))
open(path, 'w', encoding='utf-8').write('\n'.join(result))
