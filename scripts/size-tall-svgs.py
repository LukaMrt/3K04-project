"""Gives the diagrams placed in a <div class="tall"> (pdf.css) their real size. Mermaid writes
width="100%" and no height on its SVGs; inside an <img> Chrome then has no intrinsic ratio
for them and draws a tall diagram in a narrow box, whatever height pdf.css asks for.
This script replaces that width by the width and height of the viewBox.
Usage: python3 size-tall-svgs.py <full-rendered.md>   (the SVGs next to it are rewritten)"""
import os
import re
import sys

path = sys.argv[1]
text = open(path, encoding='utf-8').read()
tall_parts = re.findall(r'<div class="tall">(.*?)</div>', text, re.S)
for svg in re.findall(r'\./(full-rendered-\d+\.svg)', ''.join(tall_parts)):
    svg_path = os.path.join(os.path.dirname(path), svg)
    content = open(svg_path, encoding='utf-8').read()
    _, _, width, height = re.search(r'viewBox="([^"]*)"', content).group(1).split()
    content = content.replace('width="100%"', f'width="{width}" height="{height}"', 1)
    open(svg_path, 'w', encoding='utf-8').write(content)
