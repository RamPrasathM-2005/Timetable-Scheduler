export const calculateCOMarks = (student, co, students) => {
  if (!co?.tools || !Array.isArray(co.tools)) {
    console.warn(`No valid tools for coId ${co?.coId}:`, co?.tools);
    return 0;
  }
  const studentData = students.find(s => s.regno === student.regno);
  if (!studentData) {
    console.warn(`Student not found for regno: ${student.regno}`);
    return 0;
  }
  let mark = 0;
  let totalToolWeight = 0;
  co.tools.forEach((tool) => {
    const studentMark = studentData?.marks?.[tool.toolId] || 0;
    const maxMarks = Number(tool.maxMarks) || 100;
    const weightage = Number(tool.weightage) || 100;
    if (maxMarks === 0) {
      console.warn(`Invalid maxMarks for toolId ${tool.toolId}:`, maxMarks);
      return;
    }
    console.log(`Calculating CO mark for toolId ${tool.toolId}: studentMark=${studentMark}, maxMarks=${maxMarks}, weightage=${weightage}`);
    mark += (studentMark / maxMarks) * (weightage / 100);
    totalToolWeight += weightage / 100;
  });
  const coMark = totalToolWeight > 0 ? (mark / totalToolWeight) * 100 : 0;
  console.log(`CO mark for coId ${co.coId}, regno ${student.regno}: ${coMark}`);
  return isNaN(coMark) ? 0 : coMark;
};

export const calculateInternalMarks = (regno, courseOutcomes, students) => {
  let theorySum = 0,
    theoryCount = 0,
    pracSum = 0,
    pracCount = 0,
    expSum = 0,
    expCount = 0;
  const marks = {};
  const coMarks = [];

  if (!regno || !Array.isArray(courseOutcomes) || !students) {
    console.error('Invalid inputs:', { regno, courseOutcomes, students });
    return {
      ...marks,
      avgTheory: '0.00',
      avgPractical: '0.00',
      avgExperiential: '0.00',
      finalAvg: '0.00',
    };
  }

  courseOutcomes.forEach((co) => {
    const coMark = calculateCOMarks({ regno }, co, students);
    marks[co.coId] = isNaN(coMark) ? 0 : coMark;
    const defaultWeight = courseOutcomes.length > 0 ? 100 / courseOutcomes.length : 100; // Equal weight for COs
    coMarks.push({ mark: coMark, weight: defaultWeight, type: co.coType || 'THEORY' });
    console.log(`CO ${co.coNumber} (coId: ${co.coId}, type: ${co.coType}): mark=${coMark}, weight=${defaultWeight}`);
    if (co.coType === 'THEORY') {
      theorySum += coMark;
      theoryCount++;
    } else if (co.coType === 'PRACTICAL') {
      pracSum += coMark;
      pracCount++;
    } else if (co.coType === 'EXPERIENTIAL') {
      expSum += coMark;
      expCount++;
    }
  });

  const avgTheory = theoryCount ? theorySum / theoryCount : 0;
  const avgPractical = pracCount ? pracSum / pracCount : 0;
  const avgExperiential = expCount ? expSum / expCount : 0;

  const activePartitions = [
    { count: theoryCount, type: 'THEORY' },
    { count: pracCount, type: 'PRACTICAL' },
    { count: expCount, type: 'EXPERIENTIAL' },
  ].filter((p) => p.count > 0);

  let finalAvg = 0;
  if (activePartitions.length > 0) {
    const totalWeight = coMarks
      .filter((cm) => activePartitions.some((p) => p.type === cm.type))
      .reduce((sum, cm) => sum + (cm.weight / 100), 0);
    finalAvg = coMarks
      .filter((cm) => activePartitions.some((p) => p.type === cm.type))
      .reduce((sum, cm) => sum + cm.mark * (cm.weight / 100) / (totalWeight || 1), 0);
  }

  console.log(`Internal marks for regno ${regno}:`, {
    marks,
    avgTheory,
    avgPractical,
    avgExperiential,
    finalAvg,
  });

  return {
    ...marks,
    avgTheory: (isNaN(avgTheory) ? 0 : avgTheory).toFixed(2),
    avgPractical: (isNaN(avgPractical) ? 0 : avgPractical).toFixed(2),
    avgExperiential: (isNaN(avgExperiential) ? 0 : avgExperiential).toFixed(2),
    finalAvg: (isNaN(finalAvg) ? 0 : finalAvg).toFixed(2),
  };
};