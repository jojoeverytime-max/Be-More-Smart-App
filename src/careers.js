const CAREER_PATHS = [
  { title: "Biologist", classes: ["biology"], activities: ["clubs", "volunteering"] },
  { title: "Healthcare Professional", classes: ["biology"], activities: ["family", "volunteering"] },
  { title: "Writer", classes: ["english"], activities: ["arts", "whatever"] },
  { title: "Teacher", classes: ["english"], activities: ["clubs", "family", "volunteering"] },
  { title: "Historian", classes: ["history"], activities: ["clubs", "volunteering"] },
  { title: "Lawyer", classes: ["history", "english"], activities: ["clubs", "jobs", "whatever"] },
  { title: "Data Analyst", classes: ["mathematics", "math"], activities: ["clubs", "jobs"] },
  { title: "Engineer", classes: ["mathematics", "math"], activities: ["clubs", "jobs"] },
  { title: "Sports Coach", classes: [], activities: ["sports"] },
  { title: "Designer", classes: [], activities: ["arts"] },
  { title: "Entrepreneur", classes: [], activities: ["jobs", "clubs"] },
  { title: "Community Organizer", classes: [], activities: ["volunteering", "clubs"] },
];

function normalize(value) {
  return value.trim().toLocaleLowerCase();
}

function scoreOverallPerformance(assignments) {
  if (!assignments.length) return 0;

  const completedAssignments = assignments.filter((assignment) => assignment.completed);
  const completionRate = completedAssignments.length / assignments.length;
  const onTimeRate = completedAssignments.length
    ? completedAssignments.filter((assignment) => assignment.completedAt
      && assignment.completedAt.slice(0, 10) <= assignment.dueDate).length / completedAssignments.length
    : 0;
  const pointsPossible = assignments.length * 10;
  const pointsRate = Math.min(1, assignments.reduce((total, assignment) => total + (assignment.rewardPoints ?? 0), 0) / pointsPossible);

  return Math.round((completionRate * 0.5 + onTimeRate * 0.3 + pointsRate * 0.2) * 100);
}

export function getNextCareer(assignments, activities) {
  const overallPerformance = scoreOverallPerformance(assignments);
  const classPerformance = new Map();

  assignments.forEach((assignment) => {
    const className = assignment.className?.trim();
    if (!className) return;
    const key = normalize(className);
    const result = classPerformance.get(key) ?? { name: className, total: 0, completed: 0 };
    result.total += 1;
    if (assignment.completed) result.completed += 1;
    classPerformance.set(key, result);
  });

  const activityInterests = new Set(activities.flatMap((activity) => [
    normalize(activity.category),
    normalize(activity.name),
  ]));
  assignments.forEach((assignment) => {
    if (assignment.activityName) activityInterests.add(normalize(assignment.activityName));
  });

  const candidates = [...CAREER_PATHS];
  classPerformance.forEach(({ name }, key) => {
    if (!CAREER_PATHS.some((career) => career.classes.includes(key))) {
      candidates.push({
        title: `${name} Specialist`,
        classes: [key],
        activities: ["clubs", "jobs", "volunteering", "whatever"],
      });
    }
  });

  const scored = candidates.map((career) => {
    const relatedClasses = career.classes
      .map((className) => classPerformance.get(className))
      .filter(Boolean);
    const classResult = relatedClasses.length
      ? relatedClasses.reduce((total, result) => total + result.completed, 0)
        / relatedClasses.reduce((total, result) => total + result.total, 0)
      : null;
    const matchingActivities = career.activities.filter((activity) => activityInterests.has(activity));
    const classEvidence = relatedClasses.length > 0;
    const activityEvidence = matchingActivities.length > 0;

    if (!classEvidence && !activityEvidence) return null;

    const classScore = classEvidence ? Math.round(classResult * 100) : 0;
    const activityScore = career.activities.length
      ? Math.round((matchingActivities.length / career.activities.length) * 100)
      : 0;
    const matchScore = Math.round(overallPerformance * 0.45 + classScore * 0.35 + activityScore * 0.2);
    const strongestClass = relatedClasses
      .sort((first, second) => second.completed / second.total - first.completed / first.total
        || second.total - first.total)[0];

    return {
      title: career.title,
      matchScore,
      hasClassEvidence: classEvidence,
      reasons: [
        `Overall performance: ${overallPerformance}%`,
        ...(strongestClass ? [`${strongestClass.name} progress: ${Math.round((strongestClass.completed / strongestClass.total) * 100)}%`] : []),
        ...(matchingActivities.length ? [`Related activity: ${matchingActivities[0].replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase())}`] : []),
      ],
    };
  }).filter(Boolean);

  const bestCareer = scored.sort((first, second) => second.matchScore - first.matchScore
    || Number(second.hasClassEvidence) - Number(first.hasClassEvidence)
    || first.title.localeCompare(second.title))[0];

  if (!bestCareer) return null;
  return {
    title: bestCareer.title,
    matchScore: bestCareer.matchScore,
    reasons: bestCareer.reasons,
  };
}
