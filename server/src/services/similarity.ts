// Local text similarity engine (No external APIs or LLMs)

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10'
};

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
  'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours',
  // Common question prefixes that don't alter the core topic
  'explain', 'describe', 'discuss', 'write', 'note', 'brief', 'briefly', 'detail', 'details',
  'short', 'state', 'illustrate', 'define', 'outline', 'elaborate', 'summarize', 'give',
  'mention', 'list', 'differentiate', 'compare', 'contrast'
]);

/**
 * Normalizes text: lowercases, converts number words, removes punctuation, removes stop words
 */
export function normalizeText(text: string): { rawTokens: string[]; coreTokens: string[]; cleanedString: string } {
  let cleaned = text.toLowerCase();
  
  // Replace symbols like '5 v's' or '5-vs'
  cleaned = cleaned.replace(/['’]/g, '');
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, ' ');
  
  const rawWords = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  // Convert number words like 'five' -> '5'
  const normalizedWords = rawWords.map(w => NUMBER_WORDS[w] || w);
  
  // Filter out stop words and single characters (unless numbers)
  const coreTokens = normalizedWords.filter(w => {
    if (STOP_WORDS.has(w)) return false;
    if (w.length === 1 && !/\d/.test(w)) return false;
    return true;
  });

  return {
    rawTokens: normalizedWords,
    coreTokens,
    cleanedString: coreTokens.join(' ')
  };
}

/**
 * Generate n-grams for character level or word level
 */
function getTrigrams(str: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${str}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

/**
 * Jaccard index between two sets
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }
  
  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0;
}

/**
 * Dice coefficient (harmonic mean of precision and recall)
 */
function diceCoefficient<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  
  let intersectionSize = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionSize++;
  }
  
  return (2 * intersectionSize) / (setA.size + setB.size);
}

/**
 * Levenshtein distance ratio (0 to 1)
 */
function levenshteinRatio(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    costs[i] = i;
  }
  
  for (let i = 0; i < shorter.length; i++) {
    costs[0] = i + 1;
    let corner = i;
    for (let j = 0; j < longer.length; j++) {
      const upper = costs[j + 1];
      if (shorter[i] === longer[j]) {
        costs[j + 1] = corner;
      } else {
        const t = corner < upper ? corner : upper;
        costs[j + 1] = (costs[j] < t ? costs[j] : t) + 1;
      }
      corner = upper;
    }
  }
  
  const distance = costs[longer.length];
  return (longer.length - distance) / longer.length;
}

export interface SimilarityResult {
  score: number; // 0 to 100
  isMatchCandidate: boolean;
  isHighConfidence: boolean;
  commonTerms: string[];
  explanation: string;
}

/**
 * Compute similarity between two questions
 */
export function calculateQuestionSimilarity(q1: string, q2: string): SimilarityResult {
  if (!q1 || !q2) {
    return { score: 0, isMatchCandidate: false, isHighConfidence: false, commonTerms: [], explanation: 'Empty question' };
  }

  // Exact match
  if (q1.trim().toLowerCase() === q2.trim().toLowerCase()) {
    return {
      score: 100,
      isMatchCandidate: true,
      isHighConfidence: true,
      commonTerms: q1.split(/\s+/).slice(0, 5),
      explanation: 'Exact match'
    };
  }

  const norm1 = normalizeText(q1);
  const norm2 = normalizeText(q2);

  const tokens1 = new Set(norm1.coreTokens);
  const tokens2 = new Set(norm2.coreTokens);

  // Common keywords
  const commonTerms: string[] = [];
  for (const t of tokens1) {
    if (tokens2.has(t)) {
      commonTerms.push(t);
    }
  }

  // Jaccard & Dice on core tokens
  const tokenJaccard = jaccardSimilarity(tokens1, tokens2);
  const tokenDice = diceCoefficient(tokens1, tokens2);

  // Character Tri-gram on cleaned strings
  const trigrams1 = getTrigrams(norm1.cleanedString);
  const trigrams2 = getTrigrams(norm2.cleanedString);
  const trigramSim = jaccardSimilarity(trigrams1, trigrams2);

  // Levenshtein on cleaned string
  const levSim = levenshteinRatio(norm1.cleanedString, norm2.cleanedString);

  // Weighted composite score
  // Core token overlap is given highest weight (60%), followed by trigram (25%) and Levenshtein (15%)
  const rawScore = (0.35 * tokenDice) + (0.25 * tokenJaccard) + (0.25 * trigramSim) + (0.15 * levSim);
  
  // Scale to 0-100 and round
  let score = Math.round(rawScore * 100);

  // Domain boost: if they share distinctive multi-word or strong keywords (e.g. '5 vs', 'hadoop architecture')
  if (commonTerms.length >= 3 && score < 75) {
    score = Math.min(100, score + 12);
  }

  const isMatchCandidate = score >= 55;
  const isHighConfidence = score >= 75;

  let explanation = '';
  if (score >= 85) {
    explanation = `Very high overlap on key concepts (${commonTerms.join(', ')})`;
  } else if (score >= 70) {
    explanation = `High semantic similarity with shared terms: ${commonTerms.join(', ')}`;
  } else if (score >= 55) {
    explanation = `Moderate match. Shares key topics: ${commonTerms.join(', ')}`;
  } else {
    explanation = `Low similarity (${score}%). Distinct topics.`;
  }

  return {
    score,
    isMatchCandidate,
    isHighConfidence,
    commonTerms,
    explanation
  };
}
