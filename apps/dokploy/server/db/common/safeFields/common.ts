export type SelectFields<T> = {
  columns: Partial<Record<keyof T, boolean>>;
};
