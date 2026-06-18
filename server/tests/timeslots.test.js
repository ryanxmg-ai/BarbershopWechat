const { generateSlots, withAvailability } = require('../src/utils/timeslots');

test('生成时段含首尾，步长30分钟', () => {
  const slots = generateSlots('10:00', '11:00', 30);
  expect(slots).toEqual(['10:00', '10:30', '11:00']);
});

test('标记已占用时段', () => {
  const result = withAvailability(['10:00', '10:30'], ['10:00']);
  expect(result).toEqual([
    { time: '10:00', available: false },
    { time: '10:30', available: true },
  ]);
});
