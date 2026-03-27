export const calculateModifier = (score: number = 10) => Math.floor((score - 10) / 2);
export const calculateProficiencyBonus = (level: number = 1) => Math.ceil(level / 4) + 1;
