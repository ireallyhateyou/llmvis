window.onerror = function(msg, url, line, col, error) {
  console.error('GLOBAL ERROR:', msg, url, line, col, error);
};

// Build a tree structure from ELIZA rules for visualization
function buildElizaRuleTree() {
  if (typeof window.elizaKeywords === 'undefined') {
    console.error('elizaKeywords is not defined!');
    return { name: 'ELIZA', children: [] };
  }
  const tree = { name: 'ELIZA', children: [] };
  for (const keyword of elizaKeywords) {
    const [key, rank, decomps] = keyword;
    const keyNode = { name: key, type: 'keyword', children: [] };
    for (const decomp of decomps) {
      const [pattern, reasmbs] = decomp;
      const decompNode = { name: pattern, type: 'decomp', children: [] };
      for (const reasmb of reasmbs) {
        decompNode.children.push({ name: reasmb, type: 'reasmb' });
      }
      keyNode.children.push(decompNode);
    }
    tree.children.push(keyNode);
  }
  return tree;
}

// Tokenize input into lowercase words
function elizaTokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
}

// ELIZA-style pattern matcher supporting '*' (wildcard) and '?*var' (variable binding), capturing '*' groups
function elizaPatternMatchVars(pattern, inputTokens) {
  const patTokens = pattern.trim().split(/\s+/);
  let inputIdx = 0, patIdx = 0;
  const bindings = {};
  const starGroups = [];
  function match(patIdx, inputIdx) {
    if (patIdx === patTokens.length && inputIdx === inputTokens.length) return true;
    if (patIdx === patTokens.length || inputIdx > inputTokens.length) return false;
    const patTok = patTokens[patIdx];
    if (patTok === '*') {
      // Greedy wildcard: try to match as many tokens as possible
      for (let len = inputTokens.length - inputIdx; len >= 0; --len) {
        starGroups.push(inputTokens.slice(inputIdx, inputIdx + len).join(' '));
        if (match(patIdx + 1, inputIdx + len)) return true;
        starGroups.pop();
      }
      return false;
    } else if (/^\?\*\w+$/.test(patTok)) {
      // Greedy named variable
      const varName = patTok.slice(2);
      for (let len = inputTokens.length - inputIdx; len >= 0; --len) {
        bindings[varName] = inputTokens.slice(inputIdx, inputIdx + len).join(' ');
        if (match(patIdx + 1, inputIdx + len)) return true;
      }
      delete bindings[varName];
      return false;
    } else {
      if (inputTokens[inputIdx] === patTok) {
        return match(patIdx + 1, inputIdx + 1);
      } else {
        return false;
      }
    }
  }
  if (match(0, 0)) return { bindings, starGroups: [...starGroups] };
  return null;
}

// Given user input, return the best match: [keyword, decomp, reasmb, bindings, starGroups]
function elizaMatchPath(input) {
  const inputTokens = elizaTokenize(input);
  const rules = (new ElizaBot()).getRules();
  // Sort keywords by rank (descending), then by order
  const sorted = [...rules].sort((a, b) => b[1] - a[1]);
  let best = null;
  let bestScore = -1;
  for (const keyword of sorted) {
    const [key, rank, decomps] = keyword;
    if (!inputTokens.includes(key)) continue;
    for (const decomp of decomps) {
      const [pattern, reasmbs] = decomp;
      const matchResult = elizaPatternMatchVars(pattern, inputTokens);
      if (matchResult) {
        const { bindings, starGroups } = matchResult;
        // Score: count the number of consecutive literal tokens in the pattern that match input
        const patTokens = pattern.trim().split(/\s+/);
        let literalCount = 0;
        for (let i = 0; i < patTokens.length; ++i) {
          if (patTokens[i] !== '*' && !/^\?\*/.test(patTokens[i])) {
            literalCount++;
          }
        }
        if (literalCount > bestScore) {
          best = [key, pattern, reasmbs[0], bindings, starGroups];
          bestScore = literalCount;
        }
      }
    }
  }
  if (best) return best;
  // Fallback to xnone
  for (const keyword of sorted) {
    if (keyword[0] === 'xnone') {
      const [key, rank, decomps] = keyword;
      const [pattern, reasmbs] = decomps[0];
      return [key, pattern, reasmbs[0], {}, []];
    }
  }
  return null;
}

// Substitute variables and (n) wildcards in response
function elizaSubstitute(response, bindings, starGroups) {
  let out = response.replace(/\?([a-zA-Z]\w*)/g, (m, v) => bindings && bindings[v] ? bindings[v] : m);
  out = out.replace(/\((\d+)\)/g, (m, n) => {
    n = parseInt(n, 10);
    if (starGroups && starGroups[n - 1] !== undefined) return starGroups[n - 1];
    return m;
  });
  return out;
}

// Export for use in visualizer
window.buildElizaRuleTree = function() {
  if (typeof window.elizaKeywords === 'undefined') {
    console.error('elizaKeywords is not defined!');
    return { name: 'ELIZA', children: [] };
  }
  const tree = { name: 'ELIZA', children: [] };
  for (const keyword of elizaKeywords) {
    const [key, rank, decomps] = keyword;
    const keyNode = { name: key, type: 'keyword', children: [] };
    for (const decomp of decomps) {
      const [pattern, reasmbs] = decomp;
      const decompNode = { name: pattern, type: 'decomp', children: [] };
      for (const reasmb of reasmbs) {
        decompNode.children.push({ name: reasmb, type: 'reasmb' });
      }
      keyNode.children.push(decompNode);
    }
    tree.children.push(keyNode);
  }
  return tree;
};
window.elizaMatchPath = elizaMatchPath; 