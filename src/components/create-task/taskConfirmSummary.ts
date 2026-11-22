export interface TaskConfirmSummaryItem {
  asin: string;
  countryName: string;
  schedules: Array<{
    type_counts: Array<{
      review: string;
      schedule_num: number;
    }>;
  }>;
  totalQuantity: number;
}

function toPositiveNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function buildTaskConfirmSummary(tasks: TaskConfirmSummaryItem[]): string {
  const countryTotals = new Map<string, number>();
  const asins = new Set<string>();
  const reviewTotals = new Map<string, number>();
  const reviewLabels: Record<string, string> = {
    free_review: "免评", words: "文字", image: "图片", video: "视频", feedback: "Feedback",
  };
  let totalQuantity = 0;

  tasks.forEach(task => {
    const quantity = toPositiveNumber(task.totalQuantity);
    const countryName = String(task.countryName || "").trim();
    const asin = String(task.asin || "").trim();
    totalQuantity += quantity;

    if (asin) {
      asins.add(asin);
    }

    if (countryName) {
      countryTotals.set(
        countryName,
        (countryTotals.get(countryName) || 0) + quantity
      );
    }

    task.schedules.forEach(schedule => {
      schedule.type_counts.forEach(typeCount => {
        const reviewType = String(typeCount.review || "").trim();
        if (reviewType && toPositiveNumber(typeCount.schedule_num) > 0) {
          reviewTotals.set(reviewType, (reviewTotals.get(reviewType) || 0) + toPositiveNumber(typeCount.schedule_num));
        }
      });
    });
  });

  const sections = [
    `共 ${countryTotals.size} 个国家`,
    `${asins.size} 个ASin`,
    `总量 ${totalQuantity} 单`,
    ...[...reviewTotals].map(([type, quantity]) => `${reviewLabels[type] || type} ${quantity} 单`),
  ].filter(Boolean);

  return sections.join(" | ");
}
