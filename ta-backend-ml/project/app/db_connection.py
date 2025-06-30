import os
import logging

logger = logging.getLogger(__name__)

def get_database_url():
    """
    環境に応じて適切なデータベースURLを返す
    Docker環境では127.0.0.1やlocalhostをhost.docker.internalに変換
    """
    db_url = os.environ.get('DATABASE_ROOT_URL', '')
    
    # Docker環境かどうかを判定
    if os.path.exists('/.dockerenv') or os.environ.get('DOCKER_CONTAINER'):
        # Docker内から実行されている場合
        if '127.0.0.1' in db_url or 'localhost' in db_url:
            original_url = db_url
            db_url = db_url.replace('127.0.0.1', 'host.docker.internal')
            db_url = db_url.replace('localhost', 'host.docker.internal')
            logger.info(f"Docker environment detected. Database URL converted from {original_url} to {db_url}")
    
    return db_url

def get_prisma_database_url():
    """Prisma用のデータベースURL取得"""
    return get_database_url()