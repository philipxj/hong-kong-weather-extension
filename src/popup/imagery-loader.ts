export interface ProgressiveImageryLoadOptions<TType extends string> {
  currentType: TType;
  otherTypes: TType[];
  hydrateFromStored: (type: TType) => Promise<void>;
  refresh: (type: TType) => Promise<void>;
  getCurrentType: () => TType;
  renderType: (type: TType) => void;
}

export async function loadImageryProgressively<TType extends string>({
  currentType,
  otherTypes,
  hydrateFromStored,
  refresh,
  getCurrentType,
  renderType
}: ProgressiveImageryLoadOptions<TType>): Promise<void> {
  await hydrateFromStored(currentType).catch(() => undefined);
  if (getCurrentType() === currentType) renderType(currentType);

  const refreshType = async (type: TType): Promise<void> => {
    await refresh(type);
    if (getCurrentType() === type) renderType(type);
  };

  await Promise.all(
    [currentType, ...otherTypes].map((type) => refreshType(type).catch(() => undefined))
  );
}
