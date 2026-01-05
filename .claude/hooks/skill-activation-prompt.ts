import * as fs from 'fs';
import * as path from 'path';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  allowed_tools: string[];
  prompt: string;
}

interface SkillRule {
  name: string;
  description: string;
  enforcement: 'block' | 'suggest' | 'warn';
  priority: 'critical' | 'high' | 'medium' | 'low';
  promptTriggers?: {
    keywords?: string[];
    intentPatterns?: string[];
  };
  fileTriggers?: {
    pathPatterns?: string[];
    excludePatterns?: string[];
    contentPatterns?: string[];
  };
  blockMessage?: string;
  skipConditions?: {
    sessionMarkers?: string[];
    envVars?: string[];
  };
}

interface SkillRules {
  version: string;
  skills: Record<string, SkillRule>;
}

interface MatchedSkill {
  name: string;
  rule: SkillRule;
  matchType: 'keyword' | 'intent' | 'file';
  matchedValue: string;
}

function loadSkillRules(projectDir: string): SkillRules | null {
  const rulesPath = path.join(projectDir, '.claude', 'skills', 'skill-rules.json');

  if (!fs.existsSync(rulesPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(rulesPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading skill rules:', error);
    return null;
  }
}

function checkKeywordMatch(prompt: string, keywords: string[]): string | null {
  const lowerPrompt = prompt.toLowerCase();

  for (const keyword of keywords) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }

  return null;
}

function checkIntentMatch(prompt: string, patterns: string[]): string | null {
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(prompt)) {
        return pattern;
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return null;
}

function evaluateSkills(prompt: string, rules: SkillRules): MatchedSkill[] {
  const matched: MatchedSkill[] = [];

  for (const [skillName, rule] of Object.entries(rules.skills)) {
    // Check prompt triggers
    if (rule.promptTriggers) {
      // Check keywords
      if (rule.promptTriggers.keywords) {
        const keywordMatch = checkKeywordMatch(prompt, rule.promptTriggers.keywords);
        if (keywordMatch) {
          matched.push({
            name: skillName,
            rule,
            matchType: 'keyword',
            matchedValue: keywordMatch
          });
          continue; // Don't double-match same skill
        }
      }

      // Check intent patterns
      if (rule.promptTriggers.intentPatterns) {
        const intentMatch = checkIntentMatch(prompt, rule.promptTriggers.intentPatterns);
        if (intentMatch) {
          matched.push({
            name: skillName,
            rule,
            matchType: 'intent',
            matchedValue: intentMatch
          });
        }
      }
    }
  }

  return matched;
}

function formatOutput(matched: MatchedSkill[]): string {
  if (matched.length === 0) {
    return '';
  }

  // Group by priority
  const byPriority: Record<string, MatchedSkill[]> = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  for (const skill of matched) {
    byPriority[skill.rule.priority].push(skill);
  }

  const lines: string[] = [];
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    SKILL ACTIVATION DETECTED');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  for (const priority of ['critical', 'high', 'medium', 'low']) {
    const skills = byPriority[priority];
    if (skills.length === 0) continue;

    lines.push(`[${priority.toUpperCase()} PRIORITY]`);

    for (const skill of skills) {
      const icon = skill.rule.enforcement === 'block' ? '🚫' :
                   skill.rule.enforcement === 'warn' ? '⚠️' : '💡';
      lines.push(`  ${icon} ${skill.name}`);
      lines.push(`     └─ ${skill.rule.description}`);
      lines.push(`     └─ Matched: ${skill.matchType} "${skill.matchedValue}"`);

      if (skill.rule.enforcement === 'block' && skill.rule.blockMessage) {
        lines.push(`     └─ ⛔ ${skill.rule.blockMessage}`);
      }
    }
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('ACTION: Use Skill tool BEFORE responding');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  try {
    // Read input from stdin
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    if (!input.trim()) {
      process.exit(0);
    }

    const hookInput: HookInput = JSON.parse(input);
    const projectDir = hookInput.cwd;
    const prompt = hookInput.prompt;

    // Load skill rules
    const rules = loadSkillRules(projectDir);
    if (!rules) {
      process.exit(0);
    }

    // Evaluate skills against prompt
    const matched = evaluateSkills(prompt, rules);

    // Output results
    const output = formatOutput(matched);
    if (output) {
      console.log(output);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error in skill activation:', error);
    process.exit(1);
  }
}

main();
