# StudySpace responsive beta QA matrix

This is the required manual/browser QA matrix for the deployed application. A source-code change alone does not prove mobile usability; record pass/fail and a screenshot or issue for every failed route.

## Viewports
- Small mobile: 320 × 640
- Standard mobile: 375 × 812
- Large mobile: 430 × 932
- Tablet portrait: 768 × 1024
- Laptop: 1366 × 768
- Desktop: 1920 × 1080

## Routes and flows
- Public landing page: navigation, hero, feature sections, signup/login calls to action.
- Login/signup: labels, keyboard, validation messages, password visibility, scroll behavior.
- Dashboard: navigation, cards, charts, empty states, overflow.
- Courses and course workspace: course list, details, notes/resources, unit navigation.
- AI Tutor: chat composer, streaming response, conversation history, keyboard opening/closing.
- Notes and uploads: file picker, upload progress, extracted note readability, long content.
- Assignments: prompt/rubric upload, submission, AI grading breakdown and feedback.
- Quizzes and flashcards: question controls, answer reveal, next/previous actions.
- Calendar and grades: date controls, tables/cards, horizontal overflow.
- Settings and account: all controls reachable, save feedback visible.

## Acceptance criteria
- No unintended horizontal scrolling at 320px width.
- Navigation and dialogs remain reachable with touch and keyboard.
- Text is readable without pinch zoom; controls have comfortable touch targets.
- Forms do not become hidden behind the mobile keyboard.
- Tables and long AI responses wrap or scroll within their own region.
- File upload and AI feedback states remain visible at mobile widths.
- No clipped modals, fixed footers covering controls, or inaccessible close buttons.
- Check portrait and landscape orientation on at least one physical iOS and Android device where possible.

## Result record
Date: [DATE]
Tester/device/browser: [DETAILS]
Routes tested: [LIST]
Failed checks and issue links: [DETAILS]
Sign-off: [NAME / ROLE]