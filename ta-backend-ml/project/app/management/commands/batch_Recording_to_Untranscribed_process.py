import asyncio
import sys

from django.core.management.base import BaseCommand

sys.path.append("/app")

from batch_Recording_to_Untranscribed import main


# TODO: 実行するファイル数をしているるための引数などを追加する可能性がある
class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting batch process..."))
        asyncio.run(main())
        # main()
        self.stdout.write(self.style.SUCCESS("Batch process completed successfully."))
