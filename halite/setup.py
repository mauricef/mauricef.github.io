from setuptools import find_namespace_packages
from setuptools import setup

def _parse_requirements(requirements_txt_path):
    with open(requirements_txt_path) as fp:
        return fp.read().splitlines()

setup(
    name='halite-iv-jax',
    version='1.0.0',
    url='https://github.com/mauricef/halite-iv-jax',
    author='Maurice Flanagan',
    description='JAX-based implementation of the Kaggle Halite IV game environment',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author_email='mauricef@gmail.com',
    packages=find_namespace_packages(),
    requires_python='>=3.7',
    include_package_data=True,
    zip_safe=False
)