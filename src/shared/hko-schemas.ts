import { z } from "zod";

const numberValue = z.object({ value: z.number().optional() }).passthrough();
const rainfallValue = z.object({ max: z.number().optional() }).passthrough();

export const hkoCurrentSchema = z
  .object({
    forecastDesc: z.string().optional(),
    generalSituation: z.string().optional(),
    humidity: z.object({ data: z.array(numberValue).optional() }).optional(),
    icon: z.array(z.union([z.number(), z.string()])).optional(),
    iconUpdateTime: z.string().optional(),
    rainfall: z.object({ data: z.array(rainfallValue).optional() }).optional(),
    specialWxTips: z.union([z.array(z.string()), z.string()]).optional(),
    temperature: z.object({ data: z.array(numberValue).optional() }).optional(),
    uvindex: z
      .object({
        data: z
          .array(
            z
              .object({
                desc: z.string().optional(),
                value: z.union([z.number(), z.string()]).optional()
              })
              .passthrough()
          )
          .optional()
      })
      .optional(),
    warningMessage: z.union([z.array(z.string()), z.string()]).optional()
  })
  .passthrough();

const forecastDaySchema = z
  .object({
    ForecastIcon: z.union([z.number(), z.string()]).optional(),
    forecastDate: z.string().optional(),
    forecastMaxtemp: z.object({ value: z.number().optional() }).optional(),
    forecastMaxrh: z.object({ value: z.number().optional() }).optional(),
    forecastMintemp: z.object({ value: z.number().optional() }).optional(),
    forecastMinrh: z.object({ value: z.number().optional() }).optional(),
    forecastWeather: z.string().optional(),
    forecastWind: z.string().optional(),
    week: z.string().optional()
  })
  .passthrough();

export const hkoForecastSchema = z
  .object({
    weatherForecast: z.array(forecastDaySchema).optional()
  })
  .passthrough();

export const hkoWarnsumSchema = z.record(
  z.string(),
  z
    .object({
      code: z.string().optional(),
      expireTime: z.string().optional(),
      issueTime: z.string().optional(),
      name: z.string().optional(),
      type: z.string().optional(),
      updateTime: z.string().optional()
    })
    .passthrough()
);

export const hkoWarningInfoSchema = z
  .object({
    details: z
      .array(
        z
          .object({
            contents: z.union([z.array(z.string()), z.string()]).optional(),
            expireTime: z.string().optional(),
            issueTime: z.string().optional(),
            subtype: z.string().optional(),
            updateTime: z.string().optional(),
            warningStatementCode: z.string().optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();

export type HkoCurrent = z.infer<typeof hkoCurrentSchema>;
export type HkoForecast = z.infer<typeof hkoForecastSchema>;
export type HkoWarnsum = z.infer<typeof hkoWarnsumSchema>;
export type HkoWarningInfo = z.infer<typeof hkoWarningInfoSchema>;
