interface ParseSchema<T> {
  parse: (value: unknown) => T;
}

export interface HkoValue {
  max?: number;
  value?: number;
  [key: string]: unknown;
}

export interface HkoCurrent {
  forecastDesc?: string;
  generalSituation?: string;
  humidity?: { data?: HkoValue[]; [key: string]: unknown };
  icon?: Array<number | string>;
  iconUpdateTime?: string;
  rainfall?: { data?: HkoValue[]; [key: string]: unknown };
  specialWxTips?: string[] | string;
  temperature?: { data?: HkoValue[]; [key: string]: unknown };
  uvindex?: { data?: Array<{ desc?: string; value?: number | string; [key: string]: unknown }> };
  warningMessage?: string[] | string;
  [key: string]: unknown;
}

export interface HkoForecastDay {
  ForecastIcon?: number | string;
  forecastDate?: string;
  forecastMaxtemp?: { value?: number; [key: string]: unknown };
  forecastMaxrh?: { value?: number; [key: string]: unknown };
  forecastMintemp?: { value?: number; [key: string]: unknown };
  forecastMinrh?: { value?: number; [key: string]: unknown };
  forecastWeather?: string;
  forecastWind?: string;
  week?: string;
  [key: string]: unknown;
}

export interface HkoForecast {
  weatherForecast?: HkoForecastDay[];
  [key: string]: unknown;
}

export interface HkoWarnsumItem {
  code?: string;
  expireTime?: string;
  issueTime?: string;
  name?: string;
  type?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export type HkoWarnsum = Record<string, HkoWarnsumItem>;

export interface HkoWarningInfoDetail {
  contents?: string[] | string;
  expireTime?: string;
  issueTime?: string;
  subtype?: string;
  updateTime?: string;
  warningStatementCode?: string;
  [key: string]: unknown;
}

export interface HkoWarningInfo {
  details?: HkoWarningInfoDetail[];
  [key: string]: unknown;
}

export const hkoCurrentSchema: ParseSchema<HkoCurrent> = {
  parse(value) {
    const current = objectRecord(value, "HKO current weather");
    return {
      ...current,
      forecastDesc: optionalString(current.forecastDesc),
      generalSituation: optionalString(current.generalSituation),
      humidity: optionalDataObject(current.humidity, valueItems),
      icon: optionalPrimitiveArray(current.icon, "icon"),
      iconUpdateTime: optionalString(current.iconUpdateTime),
      rainfall: optionalDataObject(current.rainfall, rainfallItems),
      specialWxTips: optionalStringList(current.specialWxTips, "specialWxTips"),
      temperature: optionalDataObject(current.temperature, valueItems),
      uvindex: parseUvIndex(current.uvindex),
      warningMessage: optionalStringList(current.warningMessage, "warningMessage")
    };
  }
};

export const hkoForecastSchema: ParseSchema<HkoForecast> = {
  parse(value) {
    const forecast = objectRecord(value, "HKO forecast");
    return {
      ...forecast,
      weatherForecast: optionalObjectArray(forecast.weatherForecast, "weatherForecast").map(
        (item) => ({
          ...item,
          ForecastIcon: optionalPrimitive(item.ForecastIcon, "ForecastIcon"),
          forecastDate: optionalString(item.forecastDate),
          forecastMaxtemp: optionalValueObject(item.forecastMaxtemp, "forecastMaxtemp"),
          forecastMaxrh: optionalValueObject(item.forecastMaxrh, "forecastMaxrh"),
          forecastMintemp: optionalValueObject(item.forecastMintemp, "forecastMintemp"),
          forecastMinrh: optionalValueObject(item.forecastMinrh, "forecastMinrh"),
          forecastWeather: optionalString(item.forecastWeather),
          forecastWind: optionalString(item.forecastWind),
          week: optionalString(item.week)
        })
      )
    };
  }
};

export const hkoWarnsumSchema: ParseSchema<HkoWarnsum> = {
  parse(value) {
    const warnsum = objectRecord(value, "HKO warning summary");
    return Object.fromEntries(
      Object.entries(warnsum).map(([key, item]) => {
        const warning = objectRecord(item, `HKO warning summary ${key}`);
        return [
          key,
          {
            ...warning,
            code: optionalString(warning.code),
            expireTime: optionalString(warning.expireTime),
            issueTime: optionalString(warning.issueTime),
            name: optionalString(warning.name),
            type: optionalString(warning.type),
            updateTime: optionalString(warning.updateTime)
          }
        ];
      })
    );
  }
};

export const hkoWarningInfoSchema: ParseSchema<HkoWarningInfo> = {
  parse(value) {
    const warningInfo = objectRecord(value, "HKO warning info");
    return {
      ...warningInfo,
      details: optionalObjectArray(warningInfo.details, "details").map((detail) => ({
        ...detail,
        contents: optionalStringList(detail.contents, "contents"),
        expireTime: optionalString(detail.expireTime),
        issueTime: optionalString(detail.issueTime),
        subtype: optionalString(detail.subtype),
        updateTime: optionalString(detail.updateTime),
        warningStatementCode: optionalString(detail.warningStatementCode)
      }))
    };
  }
};

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalPrimitive(value: unknown, label: string): number | string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" || typeof value === "string") return value;
  throw new Error(`${label} must be a number or string.`);
}

function optionalPrimitiveArray(value: unknown, label: string): Array<number | string> | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => optionalPrimitive(item, `${label}[${index}]`) ?? "");
}

function optionalStringList(value: unknown, label: string): string[] | string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) throw new Error(`${label} must be a string or array.`);
  return value.filter((item): item is string => typeof item === "string");
}

function optionalDataObject<T>(
  value: unknown,
  itemParser: (value: unknown, label: string) => T
): ({ data?: T[] } & Record<string, unknown>) | undefined {
  if (value == null) return undefined;
  const record = objectRecord(value, "HKO data object");
  const data = record.data;
  return {
    ...record,
    data: data == null ? undefined : arrayItems(data, "data", itemParser)
  };
}

function optionalValueObject(
  value: unknown,
  label: string
): ({ value?: number } & Record<string, unknown>) | undefined {
  if (value == null) return undefined;
  return valueItems(value, label);
}

function valueItems(value: unknown, label: string): HkoValue {
  const record = objectRecord(value, label);
  return {
    ...record,
    value: optionalNumber(record.value)
  };
}

function rainfallItems(value: unknown, label: string): HkoValue {
  const record = objectRecord(value, label);
  return {
    ...record,
    max: optionalNumber(record.max)
  };
}

function parseUvIndex(value: unknown): HkoCurrent["uvindex"] {
  if (value == null || typeof value === "string") return undefined;
  const record = objectRecord(value, "uvindex");
  const data = record.data;
  return {
    ...record,
    data:
      data == null
        ? undefined
        : arrayItems(data, "uvindex.data", (item, label) => {
            const uv = objectRecord(item, label);
            return {
              ...uv,
              desc: optionalString(uv.desc),
              value: optionalPrimitive(uv.value, `${label}.value`)
            };
          })
  };
}

function optionalObjectArray(value: unknown, label: string): Array<Record<string, unknown>> {
  if (value == null) return [];
  return arrayItems(value, label, objectRecord);
}

function arrayItems<T>(
  value: unknown,
  label: string,
  itemParser: (item: unknown, label: string) => T
): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((item, index) => itemParser(item, `${label}[${index}]`));
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
