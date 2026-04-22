import sys
import pytest

if __name__ == '__main__':
    print("=" * 60)
    print("开始运行接口测试...")
    print("=" * 60)

    sys.exit(pytest.main([
        '-v',
        '--tb=short',
        'tests/'
    ]))
