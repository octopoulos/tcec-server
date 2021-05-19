# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-05-19

"""
Inspect JS files
"""

import os
import re
import sys
from time import time
from typing import List

BASE = os.path.dirname(__file__)
if BASE not in sys.path:
    sys.path.append(BASE)

from commoner import read_text_safe


BASE = os.path.dirname(os.path.dirname(__file__))
JS_FOLDER = os.path.join(BASE, 'js')
SERVER_FOLDER = os.path.join(BASE, 'server')

SKIP_SOURCES = {'all', 'chart', 'tcec'}


class Inspect:
    """Inspect
    """

    def __init__(self):
        self.re_args = re.compile(r'(\w+)(?:=(?:\w+|\[.*?\]|{.*?}|\'.*?\'))?(?:[,}]|$)', re.S)
        self.re_exports = re.compile(r'[Aa]ssign\(exports, {(.*?)}\);', re.S)
        self.re_function = re.compile(r'/\*\*(.*?)\*/\r?\n(?:async )?function\s*(\w+)\s*\((.*?)\)\s*{(.*?)\r?\n}', re.S)
        self.re_globals = re.compile(r'/\*\s*globals\s*(.*?)\*/', re.S)
        self.re_requires = re.compile(r'\{?(\w[\w,.= \r\n]+)\}? = require\(.*\n')
        self.re_split = re.compile(r'[,\s]')

    def analyse_file(self, filename: str):
        """Analyse a file
        """
        text = read_text_safe(filename)
        if not (rematch := self.re_globals.search(text)):
            return
        if not (globs := rematch.group(1).strip()):
            return

        # 1) check globals
        globs = [item for item in self.re_split.split(globs) if item]
        # order
        self.check_order(filename, 'global_order', globs)

        # unused globals
        unused = []
        data = text[rematch.end():]
        for glob in globs:
            glob = glob.split(':')[0]
            if not (rematch := re.findall(rf'\b{glob}\b', data)):
                unused.append(glob)

        if unused:
            print(f"{filename}: unused: {', '.join(unused)}")

        # 2) check exports
        if rematch := self.re_exports.search(text):
            exports = [line.strip().split(':')[0] for line in rematch.group(1).strip().split('\n') if ':' in line]
            # order
            self.check_order(filename, 'export_order', exports)

            # exported globals
            glob_set = set(globs)
            if wrongs := [export for export in exports if export in glob_set]:
                print(f"{filename}: exported: {', '.join(wrongs)}")

        # 3) check function doc
        funcs = self.re_function.findall(data)
        for doc, name, args, content in funcs:
            has_return = bool(re.search(r'\n    return ', content))
            doc_return = '@returns' in doc
            if has_return is not doc_return:
                print(f'{filename}: return: {name}')

            doc_params = re.findall(r'@param \{(.*?)\}\s?([^\n\r]*)', doc)
            doc_params = [param for param in doc_params if param[0] != 'Object' or param[1] != 'obj']
            num_doc = len(doc_params)
            num_param = len(self.re_args.findall(args))
            if num_doc != num_param:
                print(f'{filename}: args: {name}: {num_doc} vs {num_param}')

        # 4) check requires
        unused = []
        requires = self.re_requires.findall(data)
        for require in requires:
            items = require.split(',')
            for item in items:
                # const uWS = path.x => 'uWS'
                item = item.split(' = ')[0].strip().split(' ')[-1:][0]
                rematch = re.findall(rf'\b{item}\b', data)
                if not rematch or len(rematch) < 2:
                    unused.append(item)

        if unused:
            print(f"{filename}: unrequired: {', '.join(unused)}")

    def analyse_folder(self, folder: str):
        """Analyse a folder
        """
        if not os.path.isdir(folder):
            return

        sources = os.listdir(folder)
        for source in sources:
            base, ext = os.path.splitext(source)
            if ext != '.js' or base.endswith('_') or base.startswith('_'):
                continue
            if base in SKIP_SOURCES:
                continue
            filename = os.path.join(folder, source)

            if os.path.isdir(filename):
                self.analyse_folder(filename)
            elif os.path.isfile(filename):
                self.analyse_file(filename)

    def check_order(self, filename: str, section: str, texts: List[str]):
        """Check if texts are in alphabetical order
        """
        alphas = sorted(texts, key=lambda x: x.split(':')[0].lower())
        if texts == alphas:
            return
        for text, alpha in zip(texts, alphas):
            if text != alpha:
                print(f'{filename}: {section}: {text} vs {alpha}')
                break

    def go(self):
        """Run JS inspect + PY inspector
        """
        self.analyse_folder(BASE)
        self.analyse_folder(JS_FOLDER)
        self.analyse_folder(SERVER_FOLDER)


if __name__ == '__main__':
    start = time()
    inspect = Inspect()
    inspect.go()
    print(f'\nELAPSED: {time() - start:.3f} seconds')
