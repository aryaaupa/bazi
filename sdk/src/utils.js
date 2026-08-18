import { ValidationError } from './errors.js';

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const sigmoid = (value) => 1 / (1 + Math.exp(-value));
export const nowIso = (clock) => new Date(clock()).toISOString();
export const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function standardDeviation(values) {
  if (!values.length) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

export function slope(values) {
  if (values.length < 2) return 0;
  const xMean = (values.length - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean);
    denominator += (index - xMean) ** 2;
  });
  return denominator ? numerator / denominator : 0;
}

export function assertFiniteNumber(value, name, { min = -Infinity, max = Infinity, optional = false } = {}) {
  if (optional && value == null) return;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ValidationError(`${name} must be a finite number between ${min} and ${max}`, { name, value });
  }
}

export function stableId(prefix, clock, sequence) {
  return `${prefix}-${clock().toString(36).toUpperCase()}-${sequence.toString(36).toUpperCase()}`;
}

export function deepCopy(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

export function identity(size, scale = 1) {
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => row === col ? scale : 0));
}

export function addOuterProduct(matrix, vector) {
  return matrix.map((row, i) => row.map((value, j) => value + vector[i] * vector[j]));
}

export function invert(matrix) {
  const size = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...identity(size)[i]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) throw new ValidationError('Policy matrix is singular');
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    augmented[column] = augmented[column].map((value) => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map((row) => row.slice(size));
}

export function matrixVector(matrix, vector) {
  return matrix.map((row) => dot(row, vector));
}
