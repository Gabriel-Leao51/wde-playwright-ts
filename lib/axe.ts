import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** The WCAG 2.0/2.1/2.2 A and AA rule sets; best-practice rules are left out on purpose. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export interface AxeProblem {
  rule: string;
  impact: string | null | undefined;
  help: string;
  /** The elements the rule flagged, as the selectors axe reports them. */
  targets: string[];
}

/**
 * Scan the page as it is now and return the WCAG A/AA violations, shaped so a failing
 * assertion prints a readable list instead of a wall of axe's raw result. Pass `include`
 * to scan only part of the page (a modal, say).
 */
export async function scan(page: Page, include?: string): Promise<AxeProblem[]> {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder.include(include);
  const { violations } = await builder.analyze();
  return violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
}
