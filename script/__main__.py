# coding: utf-8
# @author octopoulo <polluxyz@gmail.com>
# @version 2021-05-19

"""
Main
"""

from argparse import ArgumentParser
import os
from time import time

from commoner import create_group
from util import add_arguments_util, main_util


def main():
    """Main
    """
    parser = ArgumentParser(description='TCEC', prog='python __main__.py')
    add = create_group(parser, 'tcec')
    add_arguments_util(parser)

    # configure args
    args = parser.parse_args()
    args_dict = vars(args)
    args_set = set(item for item, value in args_dict.items() if value)

    # utils
    if args_set & {'inspector'}:
        main_util(parser)


if __name__ == '__main__':
    start = time()
    main()
    print(f'\nELAPSED: {time() - start:.3f} seconds')
