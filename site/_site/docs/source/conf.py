# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import os
import sys
import sphinx_rtd_theme
from datetime import date


sys.path.insert(0, os.path.abspath('../../../'))

# -- Project information -----------------------------------------------------
project = 'HED JavaScript'
copyright = '2017-{}, HED Working Group'.format(date.today().year)
author = 'HED Working Group'

# Add the Node.js dependency
install_requires = [
    'nodejs>=16.13.2',
    'python>=3.7'
]

# The full version, including alpha/beta/rc tags
version = '4.0.0'
release = '4.0.0'

currentdir = os.path.realpath(os.path.dirname(__file__))


# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    'sphinx.ext.autodoc',
    'sphinx_js'
]

root_for_relative_js_paths = "../../"
js_source_path = "../../../src"

# def find_all_folders(directory):
#     all_folders = [directory]
#
#     for root, dirs, _ in os.walk(directory):
#         for d in dirs:
#             all_folders.append(os.path.join(root, d))
#
#     return all_folders
#
# js_source_path = []
# for folder in base_folders:
#     js_source_path += find_all_folders(folder)
# print(js_source_path)
primary_domain = 'js'

# Add any paths that contain templates here, relative to this directory.
templates_path = ['_templates']
source_suffix = ['.rst', '.md']
master_doc = 'index'

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ['_build', '_templates', 'Thumbs.db', '.DS_Store', 'venv']


# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
#

pygments_style = 'sphinx'
html_theme = "sphinx_rtd_theme"
html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]

html_theme_options = {
    'analytics_id': 'UA-XXXXXXX-1',  # Provided by Google in your dashboard
    'analytics_anonymize_ip': False,
    'logo_only': False,
    'display_version': True,
    'prev_next_buttons_location': 'top',
    'style_external_links': False,
    'vcs_pageview_mode': '',
    'style_nav_header_background': 'LightSlateGray',
    # Toc options
    'collapse_navigation': False,
    'sticky_navigation': True,
    'navigation_depth': 6,
    'includehidden': True,
    'titles_only': False
}
# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
import sphinx_rtd_theme
html_static_path = [os.path.join(sphinx_rtd_theme.get_html_theme_path(), 'sphinx_rtd_theme', 'static')]


