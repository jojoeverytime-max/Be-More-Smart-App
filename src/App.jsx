import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNextCareer } from "./careers.js";
import { getRewardProgress } from "./rewards.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CLASSES = ["Biology", "English", "History", "Mathematics"];
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const formatCurrency = (amount) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
const SUBJECT_COLORS = {
  Biology: "#62c6a0",
  English: "#a996ef",
  History: "#f2a581",
  Mathematics: "#68a6e6",
  Other: "#91a0b7",
};

const QUIZ_QUESTIONS = [
  { subject: "Business basics", question: "A shop sells a notebook for $8. It cost $5 to make. What is the profit before other expenses?", choices: ["$3", "$5", "$8", "$13"], answer: 0 },
  { subject: "Customers", question: "Who is a customer?", choices: ["Someone who buys a product", "Someone who makes a rule", "A type of product", "A business expense"], answer: 0 },
  { subject: "Entrepreneurship", question: "What does an entrepreneur do?", choices: ["Starts or runs a business", "Only shops online", "Sets school grades", "Delivers the mail"], answer: 0 },
  { subject: "Marketing", question: "What is a common goal of advertising?", choices: ["Tell people about a product", "Count inventory", "Pay electricity bills", "Hire a delivery driver"], answer: 0 },
  { subject: "Money", question: "A business earns $20 and spends $12. How much is left before other costs?", choices: ["$8", "$12", "$20", "$32"], answer: 0 },
  { subject: "Software engineering", question: "What is a bug in software?", choices: ["An error in a program", "A computer part", "A type of website", "A saved password"], answer: 0 },
  { subject: "Programming", question: "What is a variable commonly used for?", choices: ["Storing a value", "Cleaning a screen", "Connecting a keyboard", "Drawing a logo"], answer: 0 },
  { subject: "Web development", question: "What does HTML help describe?", choices: ["The structure of a web page", "A computer's battery level", "Internet speed", "A user's password"], answer: 0 },
  { subject: "Software engineering", question: "Why do developers test software?", choices: ["To find problems and check behavior", "To make the screen brighter", "To create a new keyboard", "To charge a laptop"], answer: 0 },
  { subject: "Programming", question: "What is a loop useful for?", choices: ["Repeating instructions", "Deleting the internet", "Changing a monitor", "Printing a book"], answer: 0 },
];

function randomQuestionIndex(currentIndex) {
  const nextIndex = Math.floor(Math.random() * (QUIZ_QUESTIONS.length - 1));
  return nextIndex >= currentIndex ? nextIndex + 1 : nextIndex;
}

function Icon({ name, className = "" }) {
  return <svg className={className} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

function PopQuiz() {
  const [questionIndex, setQuestionIndex] = useState(() => Math.floor(Math.random() * QUIZ_QUESTIONS.length));
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const question = QUIZ_QUESTIONS[questionIndex];
  const answeredCorrectly = selectedAnswer === question.answer;

  function nextQuestion() {
    setQuestionIndex((currentIndex) => randomQuestionIndex(currentIndex));
    setSelectedAnswer(null);
  }

  return (
    <section className="pop-quiz-card" aria-labelledby="pop-quiz-title">
      <div className="pop-quiz-heading">
        <span className="quiz-icon"><Icon name="spark" /></span>
        <div><span className="dialog-eyebrow">A QUICK BRAIN BREAK</span><h2 id="pop-quiz-title">Pop quiz</h2></div>
      </div>
      <span className="quiz-subject">{question.subject}</span>
      <p className="quiz-question">{question.question}</p>
      <div className="quiz-choices" role="group" aria-label="Answer choices">
        {question.choices.map((choice, index) => {
          const isCorrect = index === question.answer;
          const isSelected = index === selectedAnswer;
          const resultClass = selectedAnswer === null ? "" : isCorrect ? "correct" : isSelected ? "incorrect" : "";
          return (
            <button
              key={choice}
              className={`quiz-choice ${resultClass}`}
              onClick={() => setSelectedAnswer(index)}
              disabled={selectedAnswer !== null}
              aria-pressed={isSelected}
            >{choice}</button>
          );
        })}
      </div>
      {selectedAnswer !== null && (
        <p className={`quiz-feedback ${answeredCorrectly ? "correct" : "incorrect"}`} role="status" aria-live="polite">
          {answeredCorrectly ? "That’s right! Nice work." : `Not quite — the answer is ${question.choices[question.answer]}.`}
        </p>
      )}
      <button className="quiz-next" onClick={nextQuestion} disabled={selectedAnswer === null}>Next question <Icon name="chevron" /></button>
    </section>
  );
}

function PublicChat({ request, user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const chatMessages = useRef(null);
  const displayName = user.name || user.nickname || user.email?.split("@")[0] || "Student";

  const refreshMessages = useCallback(async () => {
    const nextMessages = await request("/api/messages");
    setMessages(nextMessages);
    setSelectedMessageId((selectedId) => (
      nextMessages.some((message) => message.id === selectedId && message.senderId === user.sub) ? selectedId : ""
    ));
    setError("");
  }, [request, user.sub]);

  useEffect(() => {
    refreshMessages().catch((loadError) => setError(loadError.message || "Could not load messages."));
    const timer = window.setInterval(() => {
      refreshMessages().catch((loadError) => setError(loadError.message || "Could not refresh messages."));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refreshMessages]);

  useEffect(() => {
    if (chatMessages.current) chatMessages.current.scrollTop = chatMessages.current.scrollHeight;
  }, [messages.length]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const message = await request("/api/messages", {
        method: "POST",
        body: JSON.stringify({ displayName, text }),
      });
      setText("");
      try {
        await refreshMessages();
        chatMessages.current?.scrollTo({ top: chatMessages.current.scrollHeight, behavior: "smooth" });
      } catch {
        setMessages((currentMessages) => [...currentMessages, message].slice(-100));
        setError("Message sent, but chat could not refresh. Use Refresh to reload it.");
      }
    } catch (sendError) {
      setError(sendError.message || "Could not send your message.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedMessage() {
    if (!selectedMessageId || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await request(`/api/messages/${encodeURIComponent(selectedMessageId)}`, { method: "DELETE" });
      setMessages((currentMessages) => currentMessages.filter((message) => message.id !== selectedMessageId));
      setSelectedMessageId("");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete the selected message.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="public-chat-card" aria-labelledby="public-chat-title">
      <div className="public-chat-heading">
        <div>
          <span className="dialog-eyebrow">ALL SIGNED-IN USERS</span>
          <h2 id="public-chat-title">Public chat</h2>
        </div>
        <div className="chat-actions">
          {selectedMessageId && <button className="chat-delete-selected" type="button" onClick={deleteSelectedMessage} disabled={deleting}>{deleting ? "Deleting..." : "Delete selected"}</button>}
          <button className="chat-refresh" type="button" onClick={() => refreshMessages().catch((loadError) => setError(loadError.message || "Could not refresh chat."))} disabled={busy || deleting}>Refresh</button>
        </div>
      </div>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <div className="public-chat-messages" aria-live="polite" ref={chatMessages}>
        {messages.length ? messages.map((message) => (
          <article key={message.id} className={`chat-bubble ${message.senderId === user.sub ? "own" : ""} ${selectedMessageId === message.id ? "selected" : ""}`}>
            <span>{message.senderId === user.sub ? "You" : message.displayName}</span>
            <p>{message.text}</p>
            <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
            {message.senderId === user.sub && (
              <button
                className="chat-select-message"
                type="button"
                onClick={() => setSelectedMessageId((selectedId) => selectedId === message.id ? "" : message.id)}
                disabled={deleting}
                aria-pressed={selectedMessageId === message.id}
              >{selectedMessageId === message.id ? "Selected" : "Select to delete"}</button>
            )}
          </article>
        )) : <div className="chat-start"><span className="chat-start-icon"><Icon name="spark" /></span><strong>Welcome to the chat</strong><p>Start the conversation with your signed-in community.</p></div>}
      </div>
      <form className="chat-composer" onSubmit={sendMessage}>
        <label className="visually-hidden" htmlFor="public-chat-message">Write a message</label>
        <textarea id="public-chat-message" value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message to everyone..." maxLength={2000} rows={2} required />
        <button className="button button-primary" type="submit" disabled={busy || !text.trim()}>{busy ? "Sending..." : "Send"}</button>
      </form>
      <p className="chat-status" role="status">Visible to all signed-in users. New messages load every 15 seconds.</p>
    </section>
  );
}

function IconLibrary() {
  return (
    <svg className="icon-defs" aria-hidden="true">
      <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M16 3v4M8 3v4M3.5 10h17" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7" /></symbol>
      <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h7" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-bell" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></symbol>
      <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></symbol>
      <symbol id="i-spark" viewBox="0 0 24 24"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l1 2.5 2.5 1-2.5 1L19 23l-1-2.5-2.5-1 2.5-1z" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
      <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></symbol>
      <symbol id="i-cap" viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z" /><path d="M6 11v5c3 3 9 3 12 0v-5M22 9v7" /></symbol>
      <symbol id="i-logout" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" /></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></symbol>
    </svg>
  );
}

function localDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDifference(value, from = startOfDay()) {
  return Math.round((startOfDay(localDate(value)) - from) / DAY_MS);
}

function weekStart(date) {
  const monday = startOfDay(date);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}

function escapeClassColor(className, index) {
  return SUBJECT_COLORS[className] || ["#62c6a0", "#a996ef", "#f2a581", "#68a6e6"][index % 4];
}

function friendlyDate(value) {
  const difference = dayDifference(value);
  if (difference === 0) return ["Due today", "due-soon"];
  if (difference === 1) return ["Due tomorrow", ""];
  if (difference === -1) return ["Overdue", "due-soon"];
  return [`Due ${localDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, difference < 0 ? "due-soon" : difference > 1 ? "due-later" : ""];
}

function friendlyPriority(priority) {
  return ({ high: "High", medium: "Medium", low: "Low" })[priority] || "Medium";
}

function getGreeting(date) {
  const salutation = date.getHours() < 12 ? "Good morning" : date.getHours() < 17 ? "Good afternoon" : "Good evening";
  return salutation;
}

function ConfigurationScreen() {
  return (
    <>
      <IconLibrary />
      <main className="setup-screen">
        <section className="setup-card">
          <a className="brand setup-brand" href="#"><span className="brand-mark"><Icon name="cap" /></span><span className="brand-name">Be More Smart<br />on Study Day</span></a>
          <span className="dialog-eyebrow">ONE QUICK SETUP</span>
          <h1>Connect your school account</h1>
          <p>Be More Smart on Study Day needs Auth0 settings for sign-in and the API, plus a MongoDB connection. Add these to <code>.env</code> using your Auth0 application details:</p>
          <div className="setup-code"><code>VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com<br />VITE_AUTH0_CLIENT_ID=your-client-id<br />VITE_AUTH0_AUDIENCE=https://api.studyday.local<br />AUTH0_DOMAIN=your-tenant.us.auth0.com<br />AUTH0_CLIENT_ID=your-client-id<br />AUTH0_AUDIENCE=https://api.studyday.local<br />MONGODB_URI=mongodb://127.0.0.1:27017/studyday</code></div>
          <p className="setup-note">Replace every example value with your real Auth0 tenant domain, single-page application client ID, and API audience. Do not leave any value starting with <code>your-</code>. Keep your existing MongoDB connection string, then restart the app. See the README for setup instructions.</p>
        </section>
      </main>
    </>
  );
}

function LoginScreen({ loginWithRedirect, isLoading, authError }) {
  const [loginError, setLoginError] = useState("");

  async function handleLogin() {
    setLoginError("");
    try {
      await loginWithRedirect();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to start sign-in. Please try again.");
    }
  }

  return (
    <>
      <IconLibrary />
      <main className="login-screen">
        <section className="login-card">
          <a className="brand login-brand" href="#"><span className="brand-mark"><Icon name="cap" /></span><span className="brand-name">Be More Smart<br />on Study Day</span></a>
          <span className="dialog-eyebrow">A CALMER WAY TO KEEP UP</span>
          <h1>Your schoolwork,<br />sorted.</h1>
          <p>Bring your assignments, classes, and due dates together. Make a little progress every day.</p>
          {(loginError || authError) && <p className="auth-error" role="alert">{loginError || authError}</p>}
          <button
            type="button"
            className="button button-primary login-button"
            onClick={handleLogin}
            disabled={isLoading}
            aria-label="Log in"
          >
            Login <Icon name="chevron" />
          </button>
          <span className="login-footnote">Secure sign-in, powered by Auth0</span>
        </section>
        <div className="login-decoration"><span>✳</span><span>One thing at a time.</span></div>
      </main>
    </>
  );
}

function App({ authConfigured }) {
  if (!authConfigured) return <ConfigurationScreen />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently, error } = useAuth0();
  if (isLoading) return <div className="auth-loading"><span className="loading-spinner" />Getting your study space ready...</div>;
  if (!isAuthenticated) return <LoginScreen loginWithRedirect={loginWithRedirect} isLoading={isLoading} authError={error?.message} />;

  return (
    <Dashboard
      user={user}
      getAccessTokenSilently={getAccessTokenSilently}
      onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
    />
  );
}

function Dashboard({ user, getAccessTokenSilently, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [budget, setBudget] = useState({ currentBalance: 0, expenses: [], incomes: [] });
  const [budgetDraft, setBudgetDraft] = useState("0.00");
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [incomeSaving, setIncomeSaving] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState("");
  const [deletingIncomeId, setDeletingIncomeId] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [currentView, setCurrentView] = useState("today");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [activeClass, setActiveClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showClass, setShowClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState("");
  const [managingClasses, setManagingClasses] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState(() => new Set());
  const [removingClasses, setRemovingClasses] = useState(false);
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [currentCareer, setCurrentCareer] = useState("Student");
  const [careerDraft, setCareerDraft] = useState("Student");
  const [careerLoading, setCareerLoading] = useState(true);
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerError, setCareerError] = useState("");
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitySaving, setActivitySaving] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState("");
  const [activityError, setActivityError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() => (
    typeof window.Notification === "undefined" || typeof window.Notification.requestPermission !== "function"
      ? "unsupported"
      : window.Notification.permission
  ));
  const assignmentDialog = useRef(null);
  const classDialog = useRef(null);
  const toastTimer = useRef(null);
  const alertedAssignments = useRef(new Set());
  const [today, setToday] = useState(() => startOfDay());

  const request = useCallback(async (path, options = {}) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
},
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) throw new Error("Your session could not access the API. Check the Auth0 API audience settings.");
      throw new Error(problem?.error || `Request failed (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }, [getAccessTokenSilently]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  const refreshData = useCallback(async () => {
    const [nextAssignments, nextClasses, nextActivities, nextBudget] = await Promise.all([
      request("/api/assignments"),
      request("/api/classes"),
      request("/api/activities"),
      request("/api/budget"),
    ]);
    setAssignments(nextAssignments);
    setClasses(nextClasses);
    setActivities(nextActivities);
    setBudget(nextBudget);
    setBudgetDraft(nextBudget.currentBalance.toFixed(2));
    setBudgetLoading(false);
    setBudgetError("");
    setActivityError("");
    setActivitiesLoading(false);
    setApiError("");
  }, [request]);

  useEffect(() => {
    let mounted = true;
    Promise.all([request("/api/assignments"), request("/api/classes"), request("/api/activities"), request("/api/budget")])
      .then(([nextAssignments, nextClasses, nextActivities, nextBudget]) => {
        if (!mounted) return;
        setAssignments(nextAssignments);
        setClasses(nextClasses);
        setActivities(nextActivities);
        setBudget(nextBudget);
        setBudgetDraft(nextBudget.currentBalance.toFixed(2));
        setBudgetLoading(false);
        setBudgetError("");
        setApiError("");
        setActivitiesLoading(false);
      })
      .catch((error) => {
        if (mounted) {
          setApiError(error.message || "Could not connect to the Be More Smart on Study Day API.");
          setActivityError(error.message || "Could not load your activities.");
          setBudgetError(error.message || "Could not load your budget.");
          setBudgetLoading(false);
          setActivitiesLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [request]);

  useEffect(() => {
    let mounted = true;
    request("/api/profile")
      .then((profile) => {
        if (!mounted) return;
        setCurrentCareer(profile.currentCareer);
        setCareerDraft(profile.currentCareer);
        setCareerError("");
      })
      .catch((error) => {
        if (mounted) setCareerError(error.message || "Could not load your career profile.");
      })
      .finally(() => {
        if (mounted) setCareerLoading(false);
      });
    return () => { mounted = false; };
  }, [request]);

  useEffect(() => {
    const assignmentElement = assignmentDialog.current;
    if (showAssignment && assignmentElement && !assignmentElement.open) assignmentElement.showModal();
    if (!showAssignment && assignmentElement?.open) assignmentElement.close();
  }, [showAssignment]);

  useEffect(() => {
    const classElement = classDialog.current;
    if (showClass && classElement && !classElement.open) classElement.showModal();
    if (!showClass && classElement?.open) classElement.close();
  }, [showClass]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const nextDay = startOfDay();
    nextDay.setDate(nextDay.getDate() + 1);
    const timer = window.setTimeout(() => setToday(startOfDay()), nextDay.getTime() - Date.now());
    return () => window.clearTimeout(timer);
  }, [today]);

  const reminderAssignments = useMemo(() => assignments
    .filter((item) => {
      const daysUntilDue = dayDifference(item.dueDate);
      return !item.completed && daysUntilDue >= 0 && daysUntilDue <= 7;
    })
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate)
      || PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority]
      || first.title.localeCompare(second.title)),
  [assignments]);

  useEffect(() => {
    if (notificationPermission !== "granted") return undefined;

    function notifyDueSoon() {
      assignments.forEach((item) => {
        const daysUntilDue = dayDifference(item.dueDate);
        const reminderKey = `${item.id}:${item.dueDate}`;
        if (item.completed || daysUntilDue < 0 || daysUntilDue > 1 || alertedAssignments.current.has(reminderKey)) return;

        const notification = new window.Notification(`Due ${daysUntilDue === 0 ? "today" : "tomorrow"}: ${item.title}`, {
          body: `${item.className} assignment`,
        });
        alertedAssignments.current.add(reminderKey);
        notification.addEventListener("click", () => {
          window.focus();
          navigate("upcoming");
          notification.close();
        }, { once: true });
      });
    }

    notifyDueSoon();
    const timer = window.setInterval(notifyDueSoon, 60000);
    return () => window.clearInterval(timer);
  }, [assignments, notificationPermission]);

  async function enableReminders() {
    if (notificationPermission !== "default") return;
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        showToast("Browser due-date alerts are enabled.");
      } else {
        showToast("Browser alerts were not enabled. You can still check due dates here.");
      }
    } catch (permissionError) {
      showToast(permissionError.message || "Could not enable browser alerts.");
    }
  }

  const visibleAssignments = useMemo(() => assignments
    .filter((item) => {
      const difference = dayDifference(item.dueDate);
      if (currentView === "today") return difference <= 0 && !item.completed;
      if (currentView === "upcoming") return difference >= 0 && !item.completed;
      if (currentView === "completed") return item.completed;
      if (currentView === "class") return item.className === activeClass;
      return true;
    })
    .filter((item) => {
      if (currentFilter === "pending" && item.completed) return false;
      if (currentFilter === "completed" && !item.completed) return false;
      return !searchQuery || `${item.title} ${item.className}`.toLowerCase().includes(searchQuery);
    })
    .sort((first, second) => Number(first.completed) - Number(second.completed) || first.dueDate.localeCompare(second.dueDate) || first.title.localeCompare(second.title)),
  [assignments, currentView, activeClass, currentFilter, searchQuery]);

  const weekStartDate = useMemo(() => weekStart(today), [today]);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const dueToday = assignments.filter((item) => !item.completed && dayDifference(item.dueDate) === 0).length;
  const dueThisWeek = assignments.filter((item) => !item.completed && localDate(item.dueDate) >= today && localDate(item.dueDate) < weekEndDate).length;
  const completedThisWeek = assignments.filter((item) => item.completed && item.completedAt && new Date(item.completedAt) >= weekStartDate).length;
  const rewardPoints = assignments.reduce((total, item) => total + (item.rewardPoints ?? 0), 0);
  const rewardProgress = getRewardProgress(rewardPoints);
  const nextCareer = useMemo(() => getNextCareer(assignments, activities), [assignments, activities, today]);
  const displayName = user.name || user.nickname || user.email?.split("@")[0] || "Student";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const viewLabels = {
    today: ["Today's assignments", "Here's what's on your plate", "My day"],
    upcoming: ["Coming up", "Plan ahead and take it one step at a time", "Upcoming"],
    all: ["All assignments", "Everything you need to get done", "All assignments"],
    completed: ["Completed assignments", "Look at everything you've accomplished", "Completed"],
    class: [`${activeClass} assignments`, `Your work for ${activeClass}`, activeClass],
  };
  const [listTitle, listSubtitle, breadcrumb] = viewLabels[currentView];
  const weekStartForDisplay = new Date(weekStartDate);
  weekStartForDisplay.setDate(weekStartForDisplay.getDate() + weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStartForDisplay);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekEndForDisplay = new Date(weekStartForDisplay);
  weekEndForDisplay.setDate(weekEndForDisplay.getDate() + 7);
  const firstUpcomingDate = dateInputValue(weekStartForDisplay) < dateInputValue(today)
    ? dateInputValue(today)
    : dateInputValue(weekStartForDisplay);
  const comingUp = assignments.filter((item) => (
    !item.completed
    && item.dueDate >= firstUpcomingDate
    && item.dueDate < dateInputValue(weekEndForDisplay)
  ))
    .sort((first, second) => PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority]
      || first.dueDate.localeCompare(second.dueDate)
      || first.title.localeCompare(second.title))
    .slice(0, 3);

  function navigate(view, className = "") {
    setCurrentView(view);
    setActiveClass(className);
    setCurrentFilter("all");
    setMobileMenuOpen(false);
  }

  async function submitAssignment(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setBusy(true);
    try {
      await request("/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          title: String(data.get("title")).trim(),
          className: String(data.get("className")),
          activityName: String(data.get("activityName") || ""),
          dueDate: String(data.get("dueDate")),
          priority: String(data.get("priority")),
        }),
      });
      await refreshData();
      setShowAssignment(false);
      formElement.reset();
      setSearchQuery("");
      navigate("all");
      showToast("Assignment added to your list.");
    } catch (error) {
      showToast(error.message || "Could not add the assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function submitClass(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const name = String(new FormData(formElement).get("className")).trim();
    setBusy(true);
    try {
      await request("/api/classes", { method: "POST", body: JSON.stringify({ name }) });
      await refreshData();
      setShowClass(false);
      formElement.reset();
      showToast(`${name} added to your classes.`);
    } catch (error) {
      showToast(error.message || "Could not add the class.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrentCareer(event) {
    event.preventDefault();
    if (careerSaving || !careerDraft.trim()) return;
    setCareerSaving(true);
    setCareerError("");
    try {
      const profile = await request("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ currentCareer: careerDraft }),
      });
      setCurrentCareer(profile.currentCareer);
      setCareerDraft(profile.currentCareer);
      showToast("Current career saved.");
    } catch (error) {
      setCareerError(error.message || "Could not save your career.");
    } finally {
      setCareerSaving(false);
    }
  }

  async function addActivity(event) {
    event.preventDefault();
    if (activitySaving) return;
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setActivitySaving(true);
    setActivityError("");
    try {
      const activity = await request("/api/activities", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("activityName")).trim(),
          category: String(formData.get("activityCategory")),
        }),
      });
      setActivities((currentActivities) => [activity, ...currentActivities]);
      formElement.reset();
      showToast(`${activity.name} added to your activities.`);
    } catch (error) {
      setActivityError(error.message || "Could not add this activity.");
    } finally {
      setActivitySaving(false);
    }
  }

  async function removeActivity(activity) {
    setDeletingActivityId(activity.id);
    setActivityError("");
    try {
      await request(`/api/activities/${encodeURIComponent(activity.id)}`, { method: "DELETE" });
      setActivities((currentActivities) => currentActivities.filter((item) => item.id !== activity.id));
      showToast(`${activity.name} removed.`);
    } catch (error) {
      setActivityError(error.message || "Could not remove this activity.");
    } finally {
      setDeletingActivityId("");
    }
  }

  async function saveBudget(event) {
    event.preventDefault();
    if (budgetSaving) return;
    setBudgetSaving(true);
    setBudgetError("");
    try {
      const updatedBudget = await request("/api/budget", {
        method: "PUT",
        body: JSON.stringify({ currentBalance: Number(budgetDraft) }),
      });
      setBudget(updatedBudget);
      setBudgetDraft(updatedBudget.currentBalance.toFixed(2));
      showToast("Current budget saved.");
    } catch (error) {
      setBudgetError(error.message || "Could not save your current budget.");
    } finally {
      setBudgetSaving(false);
    }
  }

  async function addExpense(event) {
    event.preventDefault();
    if (expenseSaving) return;
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setExpenseSaving(true);
    setBudgetError("");
    try {
      const result = await request("/api/budget/expenses", {
        method: "POST",
        body: JSON.stringify({
          description: String(formData.get("description")).trim(),
          amount: Number(formData.get("amount")),
          date: String(formData.get("date")),
        }),
      });
      setBudget(result.budget);
      setBudgetDraft(result.budget.currentBalance.toFixed(2));
      formElement.reset();
      showToast("Expense added and deducted from your budget.");
    } catch (error) {
      setBudgetError(error.message || "Could not add this expense.");
    } finally {
      setExpenseSaving(false);
    }
  }

  async function addIncome(event) {
    event.preventDefault();
    if (incomeSaving) return;
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    setIncomeSaving(true);
    setBudgetError("");
    try {
      const result = await request("/api/budget/income", {
        method: "POST",
        body: JSON.stringify({
          description: String(formData.get("description")).trim(),
          amount: Number(formData.get("amount")),
          date: String(formData.get("date")),
        }),
      });
      setBudget(result.budget);
      setBudgetDraft(result.budget.currentBalance.toFixed(2));
      formElement.reset();
      setShowIncomeForm(false);
      showToast("Income added to your budget.");
    } catch (error) {
      setBudgetError(error.message || "Could not add this income.");
    } finally {
      setIncomeSaving(false);
    }
  }

  async function removeIncome(income) {
    setDeletingIncomeId(income.id);
    setBudgetError("");
    try {
      const updatedBudget = await request(`/api/budget/income/${encodeURIComponent(income.id)}`, { method: "DELETE" });
      setBudget(updatedBudget);
      setBudgetDraft(updatedBudget.currentBalance.toFixed(2));
      showToast("Income removed from your budget.");
    } catch (error) {
      setBudgetError(error.message || "Could not remove this income.");
    } finally {
      setDeletingIncomeId("");
    }
  }

  async function removeExpense(expense) {
    setDeletingExpenseId(expense.id);
    setBudgetError("");
    try {
      const updatedBudget = await request(`/api/budget/expenses/${encodeURIComponent(expense.id)}`, { method: "DELETE" });
      setBudget(updatedBudget);
      setBudgetDraft(updatedBudget.currentBalance.toFixed(2));
      showToast("Expense removed and refunded to your budget.");
    } catch (error) {
      setBudgetError(error.message || "Could not remove this expense.");
    } finally {
      setDeletingExpenseId("");
    }
  }

  async function toggleAssignment(item) {
    try {
      const updatedAssignment = await request(`/api/assignments/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !item.completed }),
      });
      await refreshData();
      if (!item.completed) {
        const pointsEarned = updatedAssignment.rewardPoints - (item.rewardPoints ?? 0);
        const previousLevel = getRewardProgress(rewardPoints).level;
        const nextLevel = getRewardProgress(rewardPoints + pointsEarned).level;
        if (nextLevel > previousLevel) {
          showToast(`Level up! You reached level ${nextLevel} and earned ${pointsEarned} points!`);
        } else if (pointsEarned > 0) {
          showToast(`Assignment complete. You earned ${pointsEarned} reward points!`);
        } else {
          showToast("Assignment complete. Nice work!");
        }
      }
    } catch (error) {
      showToast(error.message || "Could not update the assignment.");
    }
  }

  async function deleteAssignment(item) {
    try {
      await request(`/api/assignments/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      await refreshData();
      showToast("Assignment removed.");
    } catch (error) {
      showToast(error.message || "Could not remove the assignment.");
    }
  }

  async function removeClass(className) {
    if (!window.confirm(`Remove "${className}"? Existing assignments will be kept.`)) return;
    setDeletingClass(className);
    try {
      await request(`/api/classes/${encodeURIComponent(className)}`, { method: "DELETE" });
      await refreshData();
      if (currentView === "class" && activeClass === className) navigate("all");
      showToast(`${className} removed. Existing assignments were kept.`);
    } catch (error) {
      showToast(error.message || "Could not remove the class.");
    } finally {
      setDeletingClass("");
    }
  }

  async function removeSelectedClasses() {
    const names = [...selectedClasses];
    if (!names.length || removingClasses) return;
    if (!window.confirm(`Remove ${names.length} selected ${names.length === 1 ? "class" : "classes"}? Existing assignments will be kept.`)) return;

    setRemovingClasses(true);
    try {
      const results = await Promise.allSettled(names.map((name) => (
        request(`/api/classes/${encodeURIComponent(name)}`, { method: "DELETE" })
      )));
      const failedNames = names.filter((_name, index) => results[index].status === "rejected");
      const removedNames = names.filter((_name, index) => results[index].status === "fulfilled");
      setSelectedClasses(new Set(failedNames));
      await refreshData();
      if (currentView === "class" && removedNames.includes(activeClass)) navigate("all");
      if (failedNames.length) {
        showToast(`Removed ${removedNames.length}; could not remove: ${failedNames.join(", ")}.`);
      } else {
        showToast(`${removedNames.length} ${removedNames.length === 1 ? "class" : "classes"} removed. Existing assignments were kept.`);
      }
    } catch (error) {
      showToast(error.message || "Could not remove the selected classes.");
    } finally {
      setRemovingClasses(false);
    }
  }

  function closeAssignmentDialog() {
    assignmentDialog.current?.querySelector("form")?.reset();
    setShowAssignment(false);
  }

  function closeClassDialog() {
    classDialog.current?.querySelector("form")?.reset();
    setShowClass(false);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector("#search-input")?.focus();
      }
      if (event.key === "Escape") {
        setShowAssignment(false);
        setShowClass(false);
        setShowReminders(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <IconLibrary />
      <div className="app-shell">
        <aside id="main-sidebar" className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <a className="brand" href="#" aria-label="Be More Smart on Study Day home"><span className="brand-mark"><Icon name="cap" /></span><span className="brand-name">Be More Smart<br />on Study Day</span></a>
          <div className="side-label">WORKSPACE</div>
          <nav className="primary-nav" aria-label="Main navigation">
            <button className={`nav-link ${currentView === "today" ? "active" : ""}`} onClick={() => navigate("today")}><Icon name="grid" /><span>My day</span><span className="nav-count">{assignments.filter((item) => !item.completed && dayDifference(item.dueDate) <= 0).length}</span></button>
            <button className={`nav-link ${currentView === "upcoming" ? "active" : ""}`} onClick={() => navigate("upcoming")}><Icon name="calendar" /><span>Upcoming</span></button>
            <button className={`nav-link ${currentView === "all" ? "active" : ""}`} onClick={() => navigate("all")}><Icon name="book" /><span>All assignments</span></button>
            <button className={`nav-link ${currentView === "completed" ? "active" : ""}`} onClick={() => navigate("completed")}><Icon name="check" /><span>Completed</span></button>
          </nav>

          <div className="side-label classes-label">
            <span>MY CLASSES</span>
            <div className="classes-actions">
              <button className="tiny-action" onClick={() => { setManagingClasses((managing) => !managing); setSelectedClasses(new Set()); }} aria-pressed={managingClasses} disabled={!managingClasses && classes.length === 0}>{managingClasses ? "Cancel" : "Remove class"}</button>
              <button className="tiny-add" onClick={() => setShowClass(true)} aria-label="Add a class"><Icon name="plus" /></button>
            </div>
          </div>
          {managingClasses && (
            <div className="class-manage-actions">
              <span>{selectedClasses.size} selected</span>
              <button className="class-remove-selected" onClick={removeSelectedClasses} disabled={!selectedClasses.size || removingClasses}>
                <Icon name="trash" />{removingClasses ? "Removing..." : "Remove"}
              </button>
            </div>
          )}
          <div className="class-list">
            {classes.map((className, index) => (
              <div key={className} className="class-row">
                <button className={`class-link ${currentView === "class" && activeClass === className ? "active" : ""}`} onClick={() => navigate("class", className)}>
                  <span className="class-dot" style={{ background: escapeClassColor(className, index) }} />{className}
                  <span className="class-total">{assignments.filter((item) => item.className === className && !item.completed).length}</span>
                </button>
                {managingClasses ? (
                  <button
                    className={`class-select ${selectedClasses.has(className) ? "selected" : ""}`}
                    onClick={() => setSelectedClasses((selected) => {
                      const next = new Set(selected);
                      if (next.has(className)) next.delete(className);
                      else next.add(className);
                      return next;
                    })}
                    disabled={removingClasses}
                    aria-label={`${selectedClasses.has(className) ? "Deselect" : "Select"} ${className}`}
                    aria-pressed={selectedClasses.has(className)}
                  ><Icon name="check" /></button>
                ) : (
                  <button className="class-delete" onClick={() => removeClass(className)} disabled={deletingClass === className} aria-label={`Remove ${className}`} title={`Remove ${className}`}><Icon name="trash" /></button>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-bottom">
            <div className="focus-card">
              <div className="focus-card-heading"><div className="focus-spark"><Icon name="spark" /></div><span className="reward-level">LEVEL {rewardProgress.level}<small>/ 99</small></span></div>
              <div className="reward-points">{rewardPoints} <small>reward points</small></div>
              <strong>Reward points</strong><p>Earn 10 points the first time you complete each assignment.</p>
              <div className="focus-progress" role="progressbar" aria-label="Progress to next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow={rewardProgress.progressPercent}>
                <span style={{ width: `${rewardProgress.progressPercent}%` }} />
              </div>
              <div className="focus-caption"><span>{rewardProgress.isMaxLevel ? "Maximum level reached" : `${rewardProgress.pointsToNextLevel} points to level ${rewardProgress.level + 1}`}</span><strong>{rewardProgress.isMaxLevel ? "MAX" : `${rewardProgress.pointsIntoLevel} / 100`}</strong></div>
              <div className="weekly-progress">
                <div className="focus-progress"><span style={{ width: `${Math.min(completedThisWeek, 5) * 20}%` }} /></div>
                <div className="focus-caption"><span>Your weekly goal</span><strong>{Math.min(completedThisWeek, 5)} / 5</strong></div>
              </div>
            </div>
            <button className="profile" onClick={onLogout} title="Sign out" aria-label="Sign out">
              <span className="avatar">{initials}</span>
              <span className="profile-info"><strong>{displayName}</strong><small>{user.email || "Student account"}</small></span>
              <Icon name="logout" className="profile-more" />
            </button>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" /><strong>{breadcrumb}</strong></div>
            <div className="top-actions">
              <label className="search-box"><Icon name="search" /><input id="search-input" type="search" placeholder="Search assignments..." aria-label="Search assignments" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value.trimStart().toLowerCase())} /><kbd>⌘ K</kbd></label>
              <div className="notification-wrap">
                <button
                  className="icon-button notification-button"
                  type="button"
                  onClick={() => setShowReminders((open) => !open)}
                  aria-label={`Due reminders${reminderAssignments.length ? `, ${reminderAssignments.length} upcoming` : ""}`}
                  aria-expanded={showReminders}
                  aria-controls="due-reminders"
                ><Icon name="bell" />{reminderAssignments.length > 0 && <span />}</button>
                {showReminders && (
                  <section className="reminder-panel" id="due-reminders" aria-labelledby="reminder-title">
                    <div className="reminder-heading">
                      <div><h2 id="reminder-title">Due reminders</h2><p>Assignments due in the next 7 days</p></div>
                      <button type="button" className="dialog-close" onClick={() => setShowReminders(false)} aria-label="Close reminders">×</button>
                    </div>
                    {notificationPermission === "default" && (
                      <button type="button" className="reminder-enable" onClick={enableReminders}>Enable browser alerts</button>
                    )}
                    {notificationPermission === "granted" && <p className="reminder-status">Browser alerts are on for assignments due today or tomorrow while Be More Smart on Study Day is open.</p>}
                    {notificationPermission === "denied" && <p className="reminder-status">Browser alerts are blocked. Allow notifications in your browser settings to enable them.</p>}
                    {notificationPermission === "unsupported" && <p className="reminder-status">Browser alerts aren’t supported here. Your due dates are still listed below.</p>}
                    {reminderAssignments.length ? (
                      <ul className="reminder-list">
                        {reminderAssignments.map((item) => {
                          const [dueText] = friendlyDate(item.dueDate);
                          return (
                            <li key={item.id}>
                              <button type="button" className="reminder-item" onClick={() => { navigate("upcoming"); setShowReminders(false); }}>
                                <span className="reminder-item-title">{item.title}<small>{item.className}</small></span>
                                <span className={`due-tag ${dayDifference(item.dueDate) === 0 ? "due-soon" : ""}`}>{dueText}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className="reminder-empty">No assignments due in the next 7 days.</p>}
                  </section>
                )}
              </div>
              <button
                className="mobile-menu"
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="main-sidebar"
              ><span /><span /><span /></button>
            </div>
          </header>

          <div className="page-content">
            <section className="welcome-row">
              <div><div className="eyebrow">{today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1>{getGreeting(new Date())}, {displayName.split(" ")[0]} <span className="wave">✳</span></h1><p className="welcome-subtitle">A little progress today makes a big difference tomorrow.</p></div>
              <button className="button button-primary" onClick={() => setShowAssignment(true)} aria-label="New assignment and tasks"><Icon name="plus" />New assignment and tasks</button>
            </section>

            <PublicChat request={request} user={user} />

            {apiError && <div className="api-error" role="alert"><span>{apiError}</span><button className="subtle-link" onClick={() => refreshData().catch((error) => setApiError(error.message))}>Retry</button></div>}

            <section className="overview-grid" aria-label="Schoolwork overview">
              <article className="stat-card"><div className="stat-top"><span className="stat-icon icon-coral"><Icon name="clock" /></span><span className="stat-note note-coral">Needs attention</span></div><div className="stat-number">{dueToday}</div><div className="stat-label">Due today</div><div className="stat-foot">{dueToday ? `${dueToday} ${dueToday === 1 ? "thing" : "things"} to focus on today` : "You're all caught up!"}</div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon icon-violet"><Icon name="calendar" /></span><span className="stat-note note-violet">Coming up</span></div><div className="stat-number">{dueThisWeek}</div><div className="stat-label">Due this week</div><div className="stat-foot">Stay ahead of the curve</div></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon icon-green"><Icon name="check" /></span><span className="stat-note note-green">Look at you go</span></div><div className="stat-number">{completedThisWeek}</div><div className="stat-label">Completed this week</div><div className="stat-foot">{completedThisWeek ? "Look at you making moves" : "Every assignment counts"}</div></article>
            </section>

            <section className="content-grid">
              <div className="assignments-panel">
                <div className="section-heading"><div><h2>{listTitle}</h2><p>{listSubtitle}</p></div>{currentView !== "all" && <button className="text-button" onClick={() => navigate("all")}>View all <Icon name="chevron" /></button>}</div>
                <div className="filter-tabs" role="tablist" aria-label="Filter assignments">
                  {["all", "pending", "completed"].map((filter) => {
                    const count = assignments.filter((item) => {
                      const matchesView = currentView === "today" ? dayDifference(item.dueDate) <= 0 && !item.completed
                        : currentView === "upcoming" ? dayDifference(item.dueDate) >= 0 && !item.completed
                          : currentView === "completed" ? item.completed
                            : currentView === "class" ? item.className === activeClass : true;
                      return matchesView && (filter === "all" || (filter === "pending" ? !item.completed : item.completed));
                    }).length;
                    return <button key={filter} className={`filter-tab ${currentFilter === filter ? "selected" : ""}`} role="tab" aria-selected={currentFilter === filter} onClick={() => setCurrentFilter(filter)}>{({ all: "All", pending: "To do", completed: "Done" })[filter]} <span>{count}</span></button>;
                  })}
                </div>
                {visibleAssignments.length ? (
                  <div className="assignment-list">
                    {visibleAssignments.map((item) => {
                      const [dueText, dueClass] = friendlyDate(item.dueDate);
                      const color = SUBJECT_COLORS[item.className] || SUBJECT_COLORS.Other;
                      return (
                        <article key={item.id} className={`assignment-row ${item.completed ? "is-complete" : ""}`}>
                          <button className="complete-toggle" onClick={() => toggleAssignment(item)} aria-label={item.completed ? "Mark incomplete" : "Mark complete"}><Icon name="check" /></button>
                          <div className="assignment-main"><div className="assignment-title">{item.title}</div><div className="assignment-meta">{item.className && <><span className="subject-tag" style={{ "--subject-color": color }}>{item.className}</span><span className="meta-divider">·</span></>}{item.activityName && <><span className="activity-tag">{item.activityName}</span><span className="meta-divider">·</span></>}<span className={`due-tag ${dueClass}`}>{dueText}</span></div></div>
                          <div className="row-right">{!item.completed && <span className={`priority-pill priority-${item.priority}`}>{friendlyPriority(item.priority)}</span>}<button className="row-menu" onClick={() => deleteAssignment(item)} aria-label={`Delete ${item.title}`} title="Delete assignment"><Icon name="more" /></button></div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-illustration"><Icon name="check" /></div><strong>{searchQuery ? "No assignments found" : "Nothing on your list"}</strong>
                    <p>{searchQuery ? "Try another search, or clear your search to see your assignments." : "Enjoy the breathing room or add a new assignment."}</p>
                    {!searchQuery && <button className="button button-soft" onClick={() => setShowAssignment(true)} aria-label="Add an assignment and tasks">Add an assignment and tasks <Icon name="plus" /></button>}
                  </div>
                )}
              </div>

              <aside className="right-column">
                <section className="week-card">
                  <div className="week-heading"><div><h2>Your week</h2><p>{weekStartForDisplay.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(weekStartForDisplay.getFullYear(), weekStartForDisplay.getMonth(), weekStartForDisplay.getDate() + 6).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p></div><button className="week-nav" onClick={() => setWeekOffset((offset) => offset === 0 ? 1 : 0)} aria-label={weekOffset === 0 ? "Show next week" : "Show this week"}><Icon name="chevron" /></button></div>
                  <div className="week-days">{weekDays.map((date) => {
                    const key = dateInputValue(date);
                    const isToday = key === dateInputValue(today);
                    const hasWork = assignments.some((item) => !item.completed && item.dueDate === key);
                    return <div key={key} className={`day-cell ${isToday ? "is-today" : ""} ${hasWork ? "has-work" : ""}`}><span className="day-name">{date.toLocaleDateString(undefined, { weekday: "short" })}</span><span className="day-number">{date.getDate()}</span></div>;
                  })}</div>
                  <div className="week-divider" />
                  <div className="up-next-heading"><h3>Coming up <span className="priority-order-label">Priority order</span></h3><button className="subtle-link" onClick={() => navigate("upcoming")}>See all</button></div>
                  <div className="upcoming-list">{comingUp.length ? comingUp.map((item) => {
                    const date = localDate(item.dueDate);
                    return <div key={item.id} className="upcoming-item"><span className="upcoming-date"><strong>{date.getDate()}</strong><small>{date.toLocaleDateString(undefined, { month: "short" })}</small></span><span className="upcoming-text"><strong>{item.title}</strong><span className="upcoming-meta"><small>{item.className}</small><span className={`upcoming-priority priority-${item.priority}`} title={`${friendlyPriority(item.priority)} priority`}>{friendlyPriority(item.priority)}</span></span></span><span className="upcoming-color" style={{ background: SUBJECT_COLORS[item.className] || SUBJECT_COLORS.Other }} /></div>;
                  }) : <div className="upcoming-empty">Nothing coming up. Enjoy the space!</div>}</div>
                </section>
                <section className="career-card" aria-labelledby="career-title">
                  <div className="career-card-heading">
                    <span className="career-icon"><Icon name="spark" /></span>
                    <span className="dialog-eyebrow">YOUR CAREER PATH</span>
                  </div>
                  <h2 id="career-title">Next possible career</h2>
                  <p className="career-context">Updates daily based on your overall progress, class performance, and outside activities.</p>
                  {nextCareer ? (
                    <>
                      <div className="career-recommendation">{nextCareer.title}</div>
                      <div className="career-progress" role="progressbar" aria-label={`Estimated match for ${nextCareer.title}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={nextCareer.matchScore}>
                        <span style={{ width: `${nextCareer.matchScore}%` }} />
                      </div>
                      <div className="career-progress-caption">
                        <span>Estimated match</span>
                        <strong>{nextCareer.matchScore}%</strong>
                      </div>
                      <ul className="career-reasons">
                        {nextCareer.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    </>
                  ) : (
                    <div className="career-recommendation">Career explorer <span>Add assignments or outside activities to get a tailored suggestion.</span></div>
                  )}
                  <form className="career-form" onSubmit={saveCurrentCareer}>
                    <label className="field-label" htmlFor="current-career">Current career</label>
                    <div className="career-form-row">
                      <input
                        className="career-input"
                        id="current-career"
                        value={careerDraft}
                        onChange={(event) => setCareerDraft(event.target.value)}
                        maxLength={80}
                        required
                        disabled={careerLoading || careerSaving}
                        aria-describedby="career-help"
                      />
                      <button className="career-save" type="submit" disabled={careerLoading || careerSaving || !careerDraft.trim() || careerDraft.trim() === currentCareer}>
                        {careerSaving ? "Saving..." : careerLoading ? "Loading..." : "Save"}
                      </button>
                    </div>
                    <span className="career-help" id="career-help">Edit this anytime to reflect your current role.</span>
                    {careerError && <p className="career-error" role="alert">{careerError}</p>}
                  </form>
                  <p className="career-disclaimer">This is a study-based estimate, not a prediction of your future or career suitability.</p>
                </section>
                <section className="budget-card" aria-labelledby="budget-title">
                  <div className="activities-heading">
                    <div>
                      <span className="dialog-eyebrow">MONEY TRACKER</span>
                      <h2 id="budget-title">Budget</h2>
                    </div>
                  </div>
                  <div className="budget-summary">
                    <span>Current balance</span>
                    <strong>{formatCurrency(budget.currentBalance)}</strong>
                    <small>{formatCurrency(budget.incomes.reduce((total, income) => total + income.amount, 0))} income · {formatCurrency(budget.expenses.reduce((total, expense) => total + expense.amount, 0))} expenses</small>
                  </div>
                  <button
                    className="budget-income-toggle"
                    type="button"
                    onClick={() => setShowIncomeForm((shown) => !shown)}
                    aria-expanded={showIncomeForm}
                    aria-controls="budget-income-form"
                    disabled={budgetLoading || incomeSaving}
                  >{showIncomeForm ? "Cancel income" : "+ Add income"}</button>
                  {showIncomeForm && (
                    <form className="budget-expense-form budget-income-form" id="budget-income-form" onSubmit={addIncome}>
                      <label className="visually-hidden" htmlFor="income-description">Income description</label>
                      <input className="activity-input" id="income-description" name="description" placeholder="Income (e.g. Allowance)" maxLength={100} required disabled={incomeSaving} />
                      <label className="visually-hidden" htmlFor="income-amount">Income amount in US dollars</label>
                      <input className="activity-input" id="income-amount" name="amount" type="number" min="0.01" max="1000000" step="0.01" placeholder="Amount ($)" required disabled={incomeSaving} />
                      <label className="visually-hidden" htmlFor="income-date">Income date</label>
                      <input className="activity-input budget-date" id="income-date" name="date" type="date" defaultValue={dateInputValue(today)} required disabled={incomeSaving} />
                      <button className="activity-add budget-add-income" type="submit" disabled={incomeSaving}>{incomeSaving ? "Adding..." : "Add income"}</button>
                    </form>
                  )}
                  {budgetError && <p className="activity-error" role="alert">{budgetError}</p>}
                  <form className="budget-balance-form" onSubmit={saveBudget}>
                    <label className="visually-hidden" htmlFor="current-budget">Set current budget in US dollars</label>
                    <span>$</span>
                    <input
                      className="activity-input"
                      id="current-budget"
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      value={budgetDraft}
                      onChange={(event) => setBudgetDraft(event.target.value)}
                      disabled={budgetLoading || budgetSaving}
                      required
                    />
                    <button className="activity-add" type="submit" disabled={budgetLoading || budgetSaving || !budgetDraft || Number(budgetDraft) < 0}>
                      {budgetSaving ? "Saving..." : "Set balance"}
                    </button>
                  </form>
                  <form className="budget-expense-form" onSubmit={addExpense}>
                    <label className="visually-hidden" htmlFor="expense-description">Expense description</label>
                    <input className="activity-input" id="expense-description" name="description" placeholder="Expense (e.g. Lunch)" maxLength={100} required disabled={budgetLoading || expenseSaving} />
                    <label className="visually-hidden" htmlFor="expense-amount">Expense amount in US dollars</label>
                    <input className="activity-input" id="expense-amount" name="amount" type="number" min="0.01" max="1000000" step="0.01" placeholder="Amount ($)" required disabled={budgetLoading || expenseSaving} />
                    <label className="visually-hidden" htmlFor="expense-date">Expense date</label>
                    <input className="activity-input budget-date" id="expense-date" name="date" type="date" defaultValue={dateInputValue(today)} required disabled={budgetLoading || expenseSaving} />
                    <button className="activity-add budget-add-expense" type="submit" disabled={budgetLoading || expenseSaving}>{expenseSaving ? "Adding..." : "Add expense"}</button>
                  </form>
                  {budgetLoading ? (
                    <p className="activities-empty">Loading your budget...</p>
                  ) : budget.expenses.length || budget.incomes.length ? (
                    <ul className="budget-expense-list">
                      {[...budget.expenses.map((entry) => ({ ...entry, type: "expense" })), ...budget.incomes.map((entry) => ({ ...entry, type: "income" }))]
                        .sort((first, second) => second.date.localeCompare(first.date))
                        .map((entry) => (
                          <li className="budget-expense-item" key={`${entry.type}-${entry.id}`}>
                            <span className="activity-item-main"><strong>{entry.description}</strong><small>{entry.type === "income" ? "Income" : "Expense"} · {localDate(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small></span>
                            <strong className={`budget-expense-amount ${entry.type === "income" ? "budget-income-amount" : ""}`}>{entry.type === "income" ? "+" : "−"}{formatCurrency(entry.amount)}</strong>
                            <button
                              className="activity-remove"
                              type="button"
                              onClick={() => entry.type === "income" ? removeIncome(entry) : removeExpense(entry)}
                              disabled={deletingExpenseId === entry.id || deletingIncomeId === entry.id}
                              aria-label={`Remove ${entry.description} ${entry.type}`}
                              title={`Remove ${entry.description} ${entry.type}`}
                            >{deletingExpenseId === entry.id || deletingIncomeId === entry.id ? "..." : "×"}</button>
                          </li>
                        ))}
                    </ul>
                  ) : <p className="activities-empty">No income or expenses yet. Add a transaction to start tracking.</p>}
                </section>
                <section className="activities-card" aria-labelledby="activities-title">
                  <div className="activities-heading">
                    <div>
                      <span className="dialog-eyebrow">BEYOND THE CLASSROOM</span>
                      <h2 id="activities-title">Outside school</h2>
                    </div>
                    <span className="activities-count">{activities.length}</span>
                  </div>
                  <p className="activities-description">Keep track of the things you enjoy beyond your schoolwork.</p>
                  {activityError && <p className="activity-error" role="alert">{activityError}</p>}
                  {activitiesLoading ? (
                    <p className="activities-empty">Loading your activities...</p>
                  ) : activities.length ? (
                    <ul className="activity-list">
                      {activities.map((activity) => (
                        <li className="activity-item" key={activity.id}>
                          <span className={`activity-marker activity-${activity.category.toLowerCase()}`} aria-hidden="true" />
                          <span className="activity-item-main"><strong>{activity.name}</strong><small>{activity.category}</small></span>
                          <button
                            className="activity-remove"
                            type="button"
                            onClick={() => removeActivity(activity)}
                            disabled={deletingActivityId === activity.id}
                            aria-label={`Remove ${activity.name}`}
                            title={`Remove ${activity.name}`}
                          >{deletingActivityId === activity.id ? "..." : "×"}</button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="activities-empty">No activities added yet. What do you enjoy outside school?</p>}
                  <form className="activity-form" onSubmit={addActivity}>
                    <label className="visually-hidden" htmlFor="activity-name">Activity name</label>
                    <input className="activity-input" id="activity-name" name="activityName" placeholder="e.g. Soccer team" maxLength={80} required disabled={activitySaving} />
                    <label className="visually-hidden" htmlFor="activity-category">Activity category</label>
                    <select className="activity-select" id="activity-category" name="activityCategory" defaultValue="Sports" disabled={activitySaving}>
                      <option>Sports</option>
                      <option>Arts</option>
                      <option>Clubs</option>
                      <option>Volunteering</option>
                      <option>Other</option>
                    </select>
                    <button className="activity-add" type="submit" disabled={activitySaving}>{activitySaving ? "Adding..." : "Add"}</button>
                  </form>
                </section>
                <PopQuiz />
                <section className="quote-card"><div className="quote-decoration">“</div><p>“The secret of getting ahead is getting started.”</p><span>— Mark Twain</span><div className="quote-doodle doodle-one" /><div className="quote-doodle doodle-two" /></section>
              </aside>
            </section>
            <footer className="footer-note">Made for curious minds <span>✳</span></footer>
          </div>
        </main>
      </div>

      <dialog className="assignment-dialog" ref={assignmentDialog} onCancel={(event) => { event.preventDefault(); closeAssignmentDialog(); }} onClick={(event) => { if (event.target === event.currentTarget) closeAssignmentDialog(); }}>
        <form onSubmit={submitAssignment}>
          <div className="dialog-header"><div><span className="dialog-eyebrow">MAKE A PLAN</span><h2>New assignment</h2></div><button className="dialog-close" type="button" onClick={closeAssignmentDialog} aria-label="Close dialog">×</button></div>
          <label className="field-label" htmlFor="assignment-title">What do you need to do?</label><input className="form-input" id="assignment-title" name="title" placeholder="e.g. Read chapter 4" required maxLength="100" />
          <div className="form-row">
            <div className="field-group">
              <label className="field-label" htmlFor="assignment-class">Class</label>
              <select className="form-input" id="assignment-class" name="className" defaultValue="">
                <option value="">None</option>
                {classes.map((className) => <option key={className}>{className}</option>)}
              </select>
              <label className="field-label" htmlFor="assignment-activity">Outside activity <span className="optional-label">Optional</span></label>
              <select className="form-input" id="assignment-activity" name="activityName" defaultValue="">
                <option value="">None</option>
                <option value="Family">Family</option>
                <option value="Jobs">Jobs</option>
                <option value="Whatever">Whatever</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="assignment-due">Due date</label>
              <input className="form-input" id="assignment-due" name="dueDate" type="date" defaultValue={dateInputValue(today)} required />
            </div>
          </div>
          <label className="field-label" htmlFor="assignment-priority">Priority</label><select className="form-input" id="assignment-priority" name="priority"><option value="medium">Just right</option><option value="high">High — make time for this</option><option value="low">Low — when I have a moment</option></select>
          <div className="dialog-actions"><button className="button button-cancel" type="button" onClick={closeAssignmentDialog}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}><Icon name="plus" />{busy ? "Adding..." : "Add assignment"}</button></div>
        </form>
      </dialog>

      <dialog className="assignment-dialog class-dialog" ref={classDialog} onCancel={(event) => { event.preventDefault(); closeClassDialog(); }} onClick={(event) => { if (event.target === event.currentTarget) closeClassDialog(); }}>
        <form onSubmit={submitClass}>
          <div className="dialog-header"><div><span className="dialog-eyebrow">MAKE IT YOURS</span><h2>Add a class</h2></div><button className="dialog-close" type="button" onClick={closeClassDialog} aria-label="Close dialog">×</button></div>
          <label className="field-label" htmlFor="class-name">What is the class called?</label><input className="form-input" id="class-name" name="className" placeholder="e.g. Art history" required maxLength="40" />
          <div className="dialog-actions"><button className="button button-cancel" type="button" onClick={closeClassDialog}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}><Icon name="plus" />{busy ? "Adding..." : "Add class"}</button></div>
        </form>
      </dialog>
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}

export default App;
