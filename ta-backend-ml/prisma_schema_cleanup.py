import re

# ファイルパス
file_path = "./schema.prisma"

# ファイルを読み込む
with open(file_path, encoding="utf-8") as file:
    content = file.readlines()

# 置換処理
new_content = []
for line in content:
    # previewFeatures = ["strictUndefinedChecks"]の行を消す
    if re.match(r'^[ \t]*previewFeatures = \["strictUndefinedChecks"\]', line):
        continue
    # output          = "./generated/prisma"の行を消す
    if re.match(r'^[ \t]*output          = "\.\/generated\/prisma"', line):
        continue
    # prisma-client-jsをprisma-client-pyに置換する
    line = line.replace("prisma-client-js", "prisma-client-py")
    new_content.append(line)

# ファイルに書き込む
with open(file_path, "w", encoding="utf-8") as file:
    file.writelines(new_content)
