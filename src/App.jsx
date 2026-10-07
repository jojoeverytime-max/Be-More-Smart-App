import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CLASSES = ["Biology", "English", "History", "Mathematics"];
const SUBJECT_COLORS = {
  Biology: "#62c6a0",
  English: "#a996ef",
  History: "#f2a581",
  Mathematics: "#68a6e6",
  Other: "#91a0b7",
};

function Icon({ name, className = "" }) {
  return <svg className={className} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
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
          <a className="brand setup-brand" href="#"><span className="brand-mark"><Icon name="cap" /></span><span>studyday<span className="brand-period">.</span></span></a>
          <span className="dialog-eyebrow">ONE QUICK SETUP</span>
          <h1>Connect your school account</h1>
          <p>Studyday needs Auth0 settings for sign-in and the API, plus a MongoDB connection. Add these to <code>.env</code> using your Auth0 application details:</p>
          <div className="setup-code"><code>VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com<br />VITE_AUTH0_CLIENT_ID=your-client-id<br />VITE_AUTH0_AUDIENCE=https://api.studyday.local<br />AUTH0_DOMAIN=your-tenant.us.auth0.com<br />AUTH0_CLIENT_ID=your-client-id<br />AUTH0_AUDIENCE=https://api.studyday.local<br />MONGODB_URI=mongodb://127.0.0.1:27017/studyday</code></div>
          <p className="setup-note">Keep your existing MongoDB connection string if it uses credentials. Copy the Auth0 domain and client ID from Auth0, then restart the app. See the README for setup instructions.</p>
        </section>
      </main>
    </>
  );
}

function LoginScreen({ loginWithRedirect, isLoading }) {
  return (
    <>
      <IconLibrary />
      <main className="login-screen">
        <section className="login-card">
          <a className="brand login-brand" href="#"><span className="brand-mark"><Icon name="cap" /></span><span>studyday<span className="brand-period">.</span></span></a>
          <span className="dialog-eyebrow">A CALMER WAY TO KEEP UP</span>
          <h1>Your schoolwork,<br />sorted.</h1>
          <p>Bring your assignments, classes, and due dates together. Make a little progress every day.</p>
          <button
            type="button"
            className="button button-primary login-button"
            onClick={() => loginWithRedirect()}
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
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0();
  if (isLoading) return <div className="auth-loading"><span className="loading-spinner" />Getting your study space ready...</div>;
  if (!isAuthenticated) return <LoginScreen loginWithRedirect={loginWithRedirect} isLoading={isLoading} />;

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
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [currentView, setCurrentView] = useState("today");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [activeClass, setActiveClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showClass, setShowClass] = useState(false);
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const assignmentDialog = useRef(null);
  const classDialog = useRef(null);
  const toastTimer = useRef(null);
  const today = useMemo(() => startOfDay(), []);

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
    const [nextAssignments, nextClasses] = await Promise.all([
      request("/api/assignments"),
      request("/api/classes"),
    ]);
    setAssignments(nextAssignments);
    setClasses(nextClasses);
    setApiError("");
  }, [request]);

  useEffect(() => {
    let mounted = true;
    Promise.all([request("/api/assignments"), request("/api/classes")])
      .then(([nextAssignments, nextClasses]) => {
        if (!mounted) return;
        setAssignments(nextAssignments);
        setClasses(nextClasses);
        setApiError("");
      })
      .catch((error) => {
        if (mounted) setApiError(error.message || "Could not connect to the Studyday API.");
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
  const comingUp = assignments.filter((item) => !item.completed && dayDifference(item.dueDate) >= 0)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
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

  async function toggleAssignment(item) {
    try {
      await request(`/api/assignments/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !item.completed }),
      });
      await refreshData();
      if (!item.completed) showToast("Assignment complete. Nice work!");
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
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <IconLibrary />
      <div className="app-shell">
        <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <a className="brand" href="#" aria-label="Studyday home"><span className="brand-mark"><Icon name="cap" /></span><span>studyday<span className="brand-period">.</span></span></a>
          <div className="side-label">WORKSPACE</div>
          <nav className="primary-nav" aria-label="Main navigation">
            <button className={`nav-link ${currentView === "today" ? "active" : ""}`} onClick={() => navigate("today")}><Icon name="grid" /><span>My day</span><span className="nav-count">{assignments.filter((item) => !item.completed && dayDifference(item.dueDate) <= 0).length}</span></button>
            <button className={`nav-link ${currentView === "upcoming" ? "active" : ""}`} onClick={() => navigate("upcoming")}><Icon name="calendar" /><span>Upcoming</span></button>
            <button className={`nav-link ${currentView === "all" ? "active" : ""}`} onClick={() => navigate("all")}><Icon name="book" /><span>All assignments</span></button>
            <button className={`nav-link ${currentView === "completed" ? "active" : ""}`} onClick={() => navigate("completed")}><Icon name="check" /><span>Completed</span></button>
          </nav>

          <div className="side-label classes-label">MY CLASSES<button className="tiny-add" onClick={() => setShowClass(true)} aria-label="Add a class"><Icon name="plus" /></button></div>
          <div className="class-list">
            {classes.map((className, index) => (
              <button key={className} className={`class-link ${currentView === "class" && activeClass === className ? "active" : ""}`} onClick={() => navigate("class", className)}>
                <span className="class-dot" style={{ background: escapeClassColor(className, index) }} />{className}
                <span className="class-total">{assignments.filter((item) => item.className === className && !item.completed).length}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <div className="focus-card">
              <div className="focus-spark"><Icon name="spark" /></div>
              <strong>Little by little</strong><p>Small steps add up to big wins. Keep going!</p>
              <div className="focus-progress"><span style={{ width: `${Math.min(completedThisWeek, 5) * 20}%` }} /></div>
              <div className="focus-caption"><span>Your weekly goal</span><strong>{Math.min(completedThisWeek, 5)} / 5</strong></div>
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
              <button className="icon-button notification-button" onClick={() => showToast("You're all caught up on notifications.")} aria-label="Notifications"><Icon name="bell" /><span /></button>
              <button className="mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Open menu"><span /><span /><span /></button>
            </div>
          </header>

          <div className="page-content">
            <section className="welcome-row">
              <div><div className="eyebrow">{today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div><h1>{getGreeting(new Date())}, {displayName.split(" ")[0]} <span className="wave">✳</span></h1><p className="welcome-subtitle">A little progress today makes a big difference tomorrow.</p></div>
              <button className="button button-primary" onClick={() => setShowAssignment(true)}><Icon name="plus" />New assignment</button>
            </section>

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
                          <div className="assignment-main"><div className="assignment-title">{item.title}</div><div className="assignment-meta"><span className="subject-tag" style={{ "--subject-color": color }}>{item.className}</span><span className="meta-divider">·</span><span className={`due-tag ${dueClass}`}>{dueText}</span></div></div>
                          <div className="row-right">{!item.completed && <span className={`priority-pill priority-${item.priority}`}>{friendlyPriority(item.priority)}</span>}<button className="row-menu" onClick={() => deleteAssignment(item)} aria-label={`Delete ${item.title}`} title="Delete assignment"><Icon name="more" /></button></div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-illustration"><Icon name="check" /></div><strong>{searchQuery ? "No assignments found" : "Nothing on your list"}</strong>
                    <p>{searchQuery ? "Try another search, or clear your search to see your assignments." : "Enjoy the breathing room or add a new assignment."}</p>
                    {!searchQuery && <button className="button button-soft" onClick={() => setShowAssignment(true)}>Add an assignment <Icon name="plus" /></button>}
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
                  <div className="up-next-heading"><h3>Coming up</h3><button className="subtle-link" onClick={() => navigate("upcoming")}>See all</button></div>
                  <div className="upcoming-list">{comingUp.length ? comingUp.map((item) => {
                    const date = localDate(item.dueDate);
                    return <div key={item.id} className="upcoming-item"><span className="upcoming-date"><strong>{date.getDate()}</strong><small>{date.toLocaleDateString(undefined, { month: "short" })}</small></span><span className="upcoming-text"><strong>{item.title}</strong><small>{item.className}</small></span><span className="upcoming-color" style={{ background: SUBJECT_COLORS[item.className] || SUBJECT_COLORS.Other }} /></div>;
                  }) : <div className="upcoming-empty">Nothing coming up. Enjoy the space!</div>}</div>
                </section>
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
          <div className="form-row"><div className="field-group"><label className="field-label" htmlFor="assignment-class">Class</label><select className="form-input" id="assignment-class" name="className" required>{classes.map((className) => <option key={className}>{className}</option>)}</select></div><div className="field-group"><label className="field-label" htmlFor="assignment-due">Due date</label><input className="form-input" id="assignment-due" name="dueDate" type="date" defaultValue={dateInputValue(today)} required /></div></div>
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
