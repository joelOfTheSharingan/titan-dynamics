import json

# read input file
with open("titan-secrets/titan-dynamics-477dac611d2f.json", "r") as f:
    data = json.load(f)

# convert to one-line JSON
one_line = json.dumps(data)

# write to output file
with open("output.txt", "w") as f:
    f.write(one_line)

print("✅ Done! Output written to output.txt")