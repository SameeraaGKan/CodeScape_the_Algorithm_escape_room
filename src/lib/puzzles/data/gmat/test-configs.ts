// Maps each GMAT test number (1–10) to its specific question IDs.
// 21 Quant (PS only) + 23 Verbal (CR + RC) + 20 Data Insights = 64 questions per test.
// Questions are non-repeating across tests.

export interface GmatTestConfig {
  testNum: number;
  label: string;
  quantIds: string[];
  verbalIds: string[];
  dataInsightsIds: string[];
}

export const GMAT_TEST_CONFIGS: GmatTestConfig[] = [
  {
    testNum: 1,
    label: "Practice Test 1",
    quantIds: [
      "gq_t1_01","gq_t1_02","gq_t1_03","gq_t1_04","gq_t1_05","gq_t1_06","gq_t1_07",
      "gq_t1_08","gq_t1_09","gq_t1_10","gq_t1_11","gq_t1_12","gq_t1_13","gq_t1_14",
      "gq_t1_15","gq_t1_16","gq_t1_17","gq_t1_18","gq_t1_19","gq_t1_20","gq_t1_21",
    ],
    verbalIds: [
      "gv_t1_cr01","gv_t1_cr02","gv_t1_cr03","gv_t1_cr04","gv_t1_cr05","gv_t1_cr06","gv_t1_cr07",
      "gv_t1_rc01","gv_t1_rc02","gv_t1_rc03","gv_t1_rc04",
      "gv_t1_rc05","gv_t1_rc06","gv_t1_rc07","gv_t1_rc08",
      "gv_t2_cr01","gv_t2_cr02","gv_t2_cr03","gv_t2_cr04","gv_t2_cr05","gv_t2_cr06","gv_t2_cr07",
      "gv_t2_rc01","gv_t2_rc02",
    ],
    dataInsightsIds: [
      "gdi_t1_ds01","gdi_t1_ds02","gdi_t1_ds03","gdi_t1_ds04","gdi_t1_ds05",
      "gdi_t1_ta01","gdi_t1_ta02",
      "gdi_t1_gi01","gdi_t1_gi02",
      "gdi_t1_tpa01","gdi_t1_tpa02",
      "gdi_t1_msr01","gdi_t1_msr02",
      "gdi_t1_ds06","gdi_t1_ds07","gdi_t1_ds08","gdi_t1_ds09","gdi_t1_ds10",
      "gdi_t1_ds11","gdi_t1_ds12",
    ],
  },
  {
    testNum: 2,
    label: "Practice Test 2",
    quantIds: [
      "gq_t2_01","gq_t2_02","gq_t2_03","gq_t2_04","gq_t2_05","gq_t2_06","gq_t2_07",
      "gq_t2_08","gq_t2_09","gq_t2_10","gq_t2_11","gq_t2_12","gq_t2_13","gq_t2_14",
      "gq_t2_15","gq_t2_16","gq_t2_17","gq_t2_18","gq_t2_19","gq_t2_20","gq_t2_21",
    ],
    verbalIds: [
      "gv_t2_rc03","gv_t2_rc04","gv_t2_rc05","gv_t2_rc06","gv_t2_rc07","gv_t2_rc08",
      "gv_t3_cr01","gv_t3_cr02","gv_t3_cr03","gv_t3_cr04","gv_t3_cr05","gv_t3_cr06","gv_t3_cr07",
      "gv_t3_rc01","gv_t3_rc02","gv_t3_rc03","gv_t3_rc04",
      "gv_t3_rc05","gv_t3_rc06","gv_t3_rc07","gv_t3_rc08",
      "gv_t4_cr01","gv_t4_cr02",
    ],
    dataInsightsIds: [
      "gdi_t2_ds01","gdi_t2_ds02","gdi_t2_ds03","gdi_t2_ds04","gdi_t2_ds05",
      "gdi_t2_ta01","gdi_t2_ta02",
      "gdi_t2_gi01","gdi_t2_gi02",
      "gdi_t2_tpa01","gdi_t2_tpa02",
      "gdi_t2_msr01","gdi_t2_msr02",
      "gdi_t2_ds06","gdi_t2_ds07","gdi_t2_ds08","gdi_t2_ds09","gdi_t2_ds10",
      "gdi_t2_ds11","gdi_t2_ds12",
    ],
  },
  {
    testNum: 3,
    label: "Practice Test 3",
    quantIds: [
      "gq_t3_01","gq_t3_02","gq_t3_03","gq_t3_04","gq_t3_05","gq_t3_06","gq_t3_07",
      "gq_t3_08","gq_t3_09","gq_t3_10","gq_t3_11","gq_t3_12","gq_t3_13","gq_t3_14",
      "gq_t3_15","gq_t3_16","gq_t3_17","gq_t3_18","gq_t3_19","gq_t3_20","gq_t3_21",
    ],
    verbalIds: [
      "gv_t4_cr03","gv_t4_cr04","gv_t4_cr05","gv_t4_cr06","gv_t4_cr07",
      "gv_t4_rc01","gv_t4_rc02","gv_t4_rc03","gv_t4_rc04",
      "gv_t4_rc05","gv_t4_rc06","gv_t4_rc07","gv_t4_rc08",
      "gv_t5_cr01","gv_t5_cr02","gv_t5_cr03","gv_t5_cr04","gv_t5_cr05","gv_t5_cr06","gv_t5_cr07",
      "gv_t5_rc01","gv_t5_rc02","gv_t5_rc03",
    ],
    dataInsightsIds: [
      "gdi_t3_ds01","gdi_t3_ds02","gdi_t3_ds03","gdi_t3_ds04","gdi_t3_ds05",
      "gdi_t3_ta01","gdi_t3_ta02",
      "gdi_t3_gi01","gdi_t3_gi02",
      "gdi_t3_tpa01","gdi_t3_tpa02",
      "gdi_t3_msr01","gdi_t3_msr02",
      "gdi_t3_ds06","gdi_t3_ds07","gdi_t3_ds08","gdi_t3_ds09","gdi_t3_ds10",
      "gdi_t3_ds11","gdi_t3_ds12",
    ],
  },
  {
    testNum: 4,
    label: "Practice Test 4",
    quantIds: [
      "gq_t4_01","gq_t4_02","gq_t4_03","gq_t4_04","gq_t4_05","gq_t4_06","gq_t4_07",
      "gq_t4_08","gq_t4_09","gq_t4_10","gq_t4_11","gq_t4_12","gq_t4_13","gq_t4_14",
      "gq_t4_15","gq_t4_16","gq_t4_17","gq_t4_18","gq_t4_19","gq_t4_20","gq_t4_21",
    ],
    verbalIds: [
      "gv_t5_rc04",
      "gv_t5_rc05","gv_t5_rc06","gv_t5_rc07","gv_t5_rc08",
      "gv_t6_cr01","gv_t6_cr02","gv_t6_cr03","gv_t6_cr04","gv_t6_cr05","gv_t6_cr06","gv_t6_cr07",
      "gv_t6_rc01","gv_t6_rc02","gv_t6_rc03","gv_t6_rc04",
      "gv_t6_rc05","gv_t6_rc06","gv_t6_rc07","gv_t6_rc08",
      "gv_t7_cr01","gv_t7_cr02","gv_t7_cr03",
    ],
    dataInsightsIds: [
      "gdi_t4_ds01","gdi_t4_ds02","gdi_t4_ds03","gdi_t4_ds04","gdi_t4_ds05",
      "gdi_t4_ta01","gdi_t4_ta02",
      "gdi_t4_gi01","gdi_t4_gi02",
      "gdi_t4_tpa01","gdi_t4_tpa02",
      "gdi_t4_msr01","gdi_t4_msr02",
      "gdi_t4_ds06","gdi_t4_ds07","gdi_t4_ds08","gdi_t4_ds09","gdi_t4_ds10",
      "gdi_t4_ds11","gdi_t4_ds12",
    ],
  },
  {
    testNum: 5,
    label: "Practice Test 5",
    quantIds: [
      "gq_t5_01","gq_t5_02","gq_t5_03","gq_t5_04","gq_t5_05","gq_t5_06","gq_t5_07",
      "gq_t5_08","gq_t5_09","gq_t5_10","gq_t5_11","gq_t5_12","gq_t5_13","gq_t5_14",
      "gq_t5_15","gq_t5_16","gq_t5_17","gq_t5_18","gq_t5_19","gq_t5_20","gq_t5_21",
    ],
    verbalIds: [
      "gv_t7_cr04","gv_t7_cr05","gv_t7_cr06","gv_t7_cr07",
      "gv_t7_rc01","gv_t7_rc02","gv_t7_rc03","gv_t7_rc04",
      "gv_t7_rc05","gv_t7_rc06","gv_t7_rc07","gv_t7_rc08",
      "gv_t8_cr01","gv_t8_cr02","gv_t8_cr03","gv_t8_cr04","gv_t8_cr05","gv_t8_cr06","gv_t8_cr07",
      "gv_t8_rc01","gv_t8_rc02","gv_t8_rc03","gv_t8_rc04",
    ],
    dataInsightsIds: [
      "gdi_t5_ds01","gdi_t5_ds02","gdi_t5_ds03","gdi_t5_ds04","gdi_t5_ds05",
      "gdi_t5_ta01","gdi_t5_ta02",
      "gdi_t5_gi01","gdi_t5_gi02",
      "gdi_t5_tpa01","gdi_t5_tpa02",
      "gdi_t5_msr01","gdi_t5_msr02",
      "gdi_t5_ds06","gdi_t5_ds07","gdi_t5_ds08","gdi_t5_ds09","gdi_t5_ds10",
      "gdi_t5_ds11","gdi_t5_ds12",
    ],
  },
  {
    testNum: 6,
    label: "Practice Test 6",
    quantIds: [
      "gq_t6_01","gq_t6_02","gq_t6_03","gq_t6_04","gq_t6_05","gq_t6_06","gq_t6_07",
      "gq_t6_08","gq_t6_09","gq_t6_10","gq_t6_11","gq_t6_12","gq_t6_13","gq_t6_14",
      "gq_t6_15","gq_t6_16","gq_t6_17","gq_t6_18","gq_t6_19","gq_t6_20","gq_t6_21",
    ],
    verbalIds: [
      "gv_t8_rc05","gv_t8_rc06","gv_t8_rc07","gv_t8_rc08",
      "gv_t9_cr01","gv_t9_cr02","gv_t9_cr03","gv_t9_cr04","gv_t9_cr05","gv_t9_cr06","gv_t9_cr07",
      "gv_t9_rc01","gv_t9_rc02","gv_t9_rc03","gv_t9_rc04",
      "gv_t9_rc05","gv_t9_rc06","gv_t9_rc07","gv_t9_rc08",
      "gv_t10_cr01","gv_t10_cr02","gv_t10_cr03","gv_t10_cr04",
    ],
    dataInsightsIds: [
      "gdi_t6_ds01","gdi_t6_ds02","gdi_t6_ds03","gdi_t6_ds04","gdi_t6_ds05",
      "gdi_t6_ta01","gdi_t6_ta02",
      "gdi_t6_gi01","gdi_t6_gi02",
      "gdi_t6_tpa01","gdi_t6_tpa02",
      "gdi_t6_msr01","gdi_t6_msr02",
      "gdi_t6_ds06","gdi_t6_ds07","gdi_t6_ds08","gdi_t6_ds09","gdi_t6_ds10",
      "gdi_t7_ds01","gdi_t7_ds02",
    ],
  },
  {
    testNum: 7,
    label: "Practice Test 7",
    quantIds: [
      "gq_t7_01","gq_t7_02","gq_t7_03","gq_t7_04","gq_t7_05","gq_t7_06","gq_t7_07",
      "gq_t7_08","gq_t7_09","gq_t7_10","gq_t7_11","gq_t7_12","gq_t7_13","gq_t7_14",
      "gq_t7_15","gq_t7_16","gq_t7_17","gq_t7_18","gq_t7_19","gq_t7_20","gq_t7_21",
    ],
    verbalIds: [
      "gv_t10_cr05","gv_t10_cr06","gv_t10_cr07",
      "gv_t10_rc01","gv_t10_rc02","gv_t10_rc03","gv_t10_rc04",
      "gv_t10_rc05","gv_t10_rc06","gv_t10_rc07","gv_t10_rc08",
      "gv_t11_cr01","gv_t11_cr02","gv_t11_cr03","gv_t11_cr04","gv_t11_cr05","gv_t11_cr06","gv_t11_cr07",
      "gv_t11_rc01","gv_t11_rc02","gv_t11_rc03","gv_t11_rc04","gv_t11_rc05",
    ],
    dataInsightsIds: [
      "gdi_t7_ds03","gdi_t7_ds04","gdi_t7_ds05",
      "gdi_t7_ta01","gdi_t7_ta02",
      "gdi_t7_gi01","gdi_t7_gi02",
      "gdi_t7_tpa01","gdi_t7_tpa02",
      "gdi_t7_msr01","gdi_t7_msr02",
      "gdi_t7_ds06","gdi_t7_ds07","gdi_t7_ds08",
      "gdi_t8_ds01","gdi_t8_ds02","gdi_t8_ds03","gdi_t8_ds04","gdi_t8_ds05",
      "gdi_t8_ta01","gdi_t8_ta02",
    ],
  },
  {
    testNum: 8,
    label: "Practice Test 8",
    quantIds: [
      "gq_t8_01","gq_t8_02","gq_t8_03","gq_t8_04","gq_t8_05","gq_t8_06","gq_t8_07",
      "gq_t8_08","gq_t8_09","gq_t8_10","gq_t8_11","gq_t8_12","gq_t8_13","gq_t8_14",
      "gq_t8_15","gq_t8_16","gq_t8_17","gq_t8_18","gq_t8_19","gq_t8_20","gq_t8_21",
    ],
    verbalIds: [
      "gv_t11_rc06","gv_t11_rc07","gv_t11_rc08",
      "gv_t12_cr01","gv_t12_cr02","gv_t12_cr03","gv_t12_cr04","gv_t12_cr05","gv_t12_cr06","gv_t12_cr07",
      "gv_t12_rc01","gv_t12_rc02","gv_t12_rc03","gv_t12_rc04",
      "gv_t12_rc05","gv_t12_rc06","gv_t12_rc07","gv_t12_rc08",
      "gv_t13_cr01","gv_t13_cr02","gv_t13_cr03","gv_t13_cr04","gv_t13_cr05",
    ],
    dataInsightsIds: [
      "gdi_t8_gi01","gdi_t8_gi02",
      "gdi_t8_tpa01","gdi_t8_tpa02",
      "gdi_t8_msr01","gdi_t8_msr02",
      "gdi_t8_ds06","gdi_t8_ds07","gdi_t8_ds08","gdi_t8_ds09","gdi_t8_ds10",
      "gdi_t9_ds01","gdi_t9_ds02","gdi_t9_ds03","gdi_t9_ds04","gdi_t9_ds05",
      "gdi_t9_ta01","gdi_t9_ta02",
      "gdi_t9_gi01","gdi_t9_gi02","gdi_t9_tpa01",
    ],
  },
  {
    testNum: 9,
    label: "Practice Test 9",
    quantIds: [
      "gq_t9_01","gq_t9_02","gq_t9_03","gq_t9_04","gq_t9_05","gq_t9_06","gq_t9_07",
      "gq_t9_08","gq_t9_09","gq_t9_10","gq_t9_11","gq_t9_12","gq_t9_13","gq_t9_14",
      "gq_t9_15","gq_t9_16","gq_t9_17","gq_t9_18","gq_t9_19","gq_t9_20","gq_t9_21",
    ],
    verbalIds: [
      "gv_t13_cr06","gv_t13_cr07",
      "gv_t13_rc01","gv_t13_rc02","gv_t13_rc03","gv_t13_rc04",
      "gv_t13_rc05","gv_t13_rc06","gv_t13_rc07","gv_t13_rc08",
      "gv_t14_cr01","gv_t14_cr02","gv_t14_cr03","gv_t14_cr04","gv_t14_cr05","gv_t14_cr06","gv_t14_cr07",
      "gv_t14_rc01","gv_t14_rc02","gv_t14_rc03","gv_t14_rc04","gv_t14_rc05","gv_t14_rc06",
    ],
    dataInsightsIds: [
      "gdi_t9_tpa02","gdi_t9_msr01","gdi_t9_msr02",
      "gdi_t9_ds06","gdi_t9_ds07","gdi_t9_ds08",
      "gdi_t9_ds09","gdi_t9_ds10","gdi_t9_ds11","gdi_t9_ds12",
      "gdi_t9_ta01","gdi_t9_ta02",
      "gdi_t9_gi01","gdi_t9_gi02",
      "gdi_t9_tpa01",
      "gdi_t9_ds01","gdi_t9_ds02","gdi_t9_ds03","gdi_t9_ds04","gdi_t9_ds05",
    ],
  },
  {
    testNum: 10,
    label: "Practice Test 10",
    quantIds: [
      "gq_t10_01","gq_t10_02","gq_t10_03","gq_t10_04","gq_t10_05","gq_t10_06","gq_t10_07",
      "gq_t10_08","gq_t10_09","gq_t10_10","gq_t10_11","gq_t10_12","gq_t10_13","gq_t10_14",
      "gq_t10_15","gq_t10_16","gq_t10_17","gq_t10_18","gq_t10_19","gq_t10_20","gq_t10_21",
    ],
    verbalIds: [
      "gv_t14_rc07","gv_t14_rc08",
      "gv_t15_cr01","gv_t15_cr02","gv_t15_cr03","gv_t15_cr04","gv_t15_cr05","gv_t15_cr06","gv_t15_cr07",
      "gv_t15_rc01","gv_t15_rc02","gv_t15_rc03","gv_t15_rc04",
      "gv_t15_rc05","gv_t15_rc06","gv_t15_rc07","gv_t15_rc08",
      "gv_t16_cr01","gv_t16_cr02","gv_t16_cr03","gv_t16_cr04","gv_t16_cr05","gv_t16_cr06",
    ],
    dataInsightsIds: [
      "gdi_t10_ds01","gdi_t10_ds02","gdi_t10_ds03","gdi_t10_ds04","gdi_t10_ds05",
      "gdi_t10_ta01","gdi_t10_ta02",
      "gdi_t10_gi01","gdi_t10_gi02",
      "gdi_t10_tpa01","gdi_t10_tpa02",
      "gdi_t10_msr01","gdi_t10_msr02",
      "gdi_t10_ds06","gdi_t10_ds07","gdi_t10_ds08",
      "gdi_t10_ds09","gdi_t10_ds10","gdi_t10_ds11","gdi_t10_ds12",
    ],
  },
];

export function getTestConfig(testNum: number): GmatTestConfig | undefined {
  return GMAT_TEST_CONFIGS.find(t => t.testNum === testNum);
}

export function getAllQuestionIdsForTest(testNum: number): string[] {
  const config = getTestConfig(testNum);
  if (!config) return [];
  return [...config.quantIds, ...config.verbalIds, ...config.dataInsightsIds];
}
