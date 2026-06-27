const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\inulf\\.gemini\\antigravity-ide\\brain\\c6a9a1c7-1b80-4507-b790-ec16c5b342b8\\.system_generated\\logs\\transcript.jsonl';
const outPath = 'C:\\Users\\inulf\\.gemini\\antigravity-ide\\brain\\c6a9a1c7-1b80-4507-b790-ec16c5b342b8\\scratch\\suggestions_search.txt';

async function main() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const out = fs.createWriteStream(outPath, { encoding: 'utf8' });

  out.write('Searching for autocomplete, suggestions, and custom dropdown changes...\n');
  for await (const line of rl) {
    try {
      const o = JSON.parse(line);
      const str = JSON.stringify(o).toLowerCase();
      if (
        str.includes('suggest') || 
        str.includes('datalist') || 
        str.includes('autocomplete') || 
        str.includes('nama laptop') || 
        str.includes('nama_laptop') ||
        str.includes('laptopName') ||
        str.includes('laptopspec') ||
        str.includes('modern-select') ||
        str.includes('modernselect')
      ) {
        out.write(`\n========================================\n`);
        out.write(`[Step ${o.step_index}] Source: ${o.source} | Type: ${o.type}\n`);
        if (o.content) {
          out.write(`Content snippet: ${o.content.substring(0, 1000)}\n`);
        }
        if (o.tool_calls) {
          o.tool_calls.forEach(tc => {
            out.write(`  Tool Call: ${tc.name} on ${tc.args.TargetFile || tc.args.AbsolutePath || ''}\n`);
            out.write(`  Instruction: ${tc.args.Instruction}\n`);
            if (tc.args.ReplacementContent) {
              out.write(`  Snippet: ${tc.args.ReplacementContent.substring(0, 800)}\n`);
            }
            if (tc.args.CodeContent) {
              out.write(`  CodeContent Snippet: ${tc.args.CodeContent.substring(0, 800)}\n`);
            }
            if (tc.args.ReplacementChunks) {
              tc.args.ReplacementChunks.forEach((ch, idx) => {
                out.write(`    Chunk ${idx}: ${ch.ReplacementContent.substring(0, 500)}\n`);
              });
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }
  out.end();
  console.log('Finished suggestions search.');
}

main().catch(console.error);
