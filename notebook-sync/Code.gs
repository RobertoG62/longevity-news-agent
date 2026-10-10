/**
 * @OnlyCurrentDoc
 *
 * Keeps the Google Doc "Longevity — מחקרים" (the NotebookLM source) in step
 * with the published site. Paste into that doc: Extensions -> Apps Script.
 *
 * Reads only the public articles.json, writes only to this doc. Only articles
 * that were reviewed, merged and published reach it, and only those with an
 * original abstract. NotebookLM picks up the change through Drive auto-sync.
 *
 *   syncArticles  — append published articles the doc doesn't have yet
 *   setupTrigger  — run once: schedule syncArticles every Sunday 12:00 Israel
 */

const ARTICLES_URL = 'https://robertog62.github.io/longevity-news-agent/content/articles.json';

function syncArticles() {
  const articles = JSON.parse(UrlFetchApp.fetch(ARTICLES_URL).getContentText());
  const body = DocumentApp.getActiveDocument().getBody();
  const docText = body.getText();

  const withAbstract = articles.filter((a) => a.abstract);
  // The source URL is the identity: an article already in the doc is never added twice
  const fresh = withAbstract.filter((a) => !docText.includes(a.sourceUrl));
  fresh.forEach((a) => appendArticle(body, a));

  const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy');
  body.replaceText('עודכן: .*', `עודכן: ${today} · ${withAbstract.length} מחקרים`);
  console.log(`Added ${fresh.length}; ${withAbstract.length} articles with an abstract on the site.`);
}

function appendArticle(body, a) {
  body.appendParagraph('────────────────────');
  body.appendParagraph(a.title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(`פורסם באתר: ${a.publishDate} · קטגוריה: ${a.category}`);
  body.appendParagraph(`מקור: ${a.sourceUrl}`);
  body.appendParagraph('Original abstract:');
  body.appendParagraph(a.abstract);
  if (a.legacy) {
    body.appendParagraph('הסיכום באתר נכתב לפני 10.10.2026 מהכותרת בלבד, ולכן לא נכלל כאן. התקציר למעלה הוא הקובע.');
    return;
  }
  body.appendParagraph('הסיכום באתר:');
  body.appendParagraph(a.summary);
  body.appendParagraph(`שורה תחתונה: ${a.bottomLine}`);
}

function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'syncArticles')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncArticles')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(12)
    .inTimezone('Asia/Jerusalem')
    .create();
}
