<template>
  <div class="wrap">
    <div class="page1-container">
      <div class="top-head">
        <h2 style="margin-bottom: 1em">Enter your query</h2>
        <a-input-search ref="inputSearch" size="medium" v-model:value="searchQueryName" @search="fetchData"
          placeholder="please enter your query in there" style="margin-bottom: 20px; width: 60%" />
      </div>
      <a-spin :spinning="loading">
        <div v-if="dataSource.length" class="table-container">
          <a-table :row-class-name="(_record, index) => (index % 2 === 1 ? 'table-striped' : null)
          " :dataSource="dataSource" :columns="columns" bordered>
            <template #bodyCell="{ column, record }">
              <a-tooltip v-if="shouldShowTooltip(column.key)">
                <template #title>
                  <span v-if="column.dataIndex === 'BM25'" v-html="getTooltipContent(record['BM25'])">
                  </span>
                  <span v-else-if="column.dataIndex === 'PL2'" v-html="getTooltipContent(record['PL2'])">
                  </span>
                  <span v-else-if="column.dataIndex === 'TFIDF'" v-html="getTooltipContent(record['TFIDF'])">
                  </span>
                </template>
                <span>{{ record[column.dataIndex].docno }}</span>
              </a-tooltip>
              <span v-else>{{ record[column.dataIndex] }}</span>
            </template>
          </a-table>
        </div>
        <div v-else class="empty-container">
          <a-empty description="暂无数据，请搜索查询。" />
        </div>
      </a-spin>
    </div>
    <div v-show="dataSource.length" class="page2-container">
      <a-row :gutter="12">
        <!-- 第一列 -->
        <a-col :span="12">
          <div class="chart-container" ref="lineChartContainer"></div>
        </a-col>
        <!-- 第二列 -->
        <a-col :span="12">
          <div class="chart-container" ref="articleReplicationChartContainer"></div>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <!-- 第一列 -->
        <a-col :span="12">
          <div class="chart-container" ref="popularityChartContainer"></div>
        </a-col>
        <!-- 第二列 -->
        <a-col :span="12">
          <div class="chart-container" ref="genderChartContainer"></div>
        </a-col>
      </a-row>
    </div>
    <div v-show="dataSource.length" class="page3-container">
      <world-map />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue';
import axios from 'axios';
import { Chart } from '@antv/g2';
import WorldMap from './WorldMap.vue';

const searchQueryName = ref('');
const loading = ref(false);
const inputSearch = ref(null);

const columns = ref([
  {
    title: 'Rank',
    dataIndex: 'rank',
    key: 'rank',
    sorter: (a, b) => a.rank - b.rank,
  },
  { title: 'Model1-BM25', dataIndex: 'BM25', key: 'BM25' },
  { title: 'Model2-PL2', dataIndex: 'PL2', key: 'PL2' },
  { title: 'Model3-TFIDF', dataIndex: 'TFIDF', key: 'TFIDF' },
]);
const tooltipColumns = ['BM25', 'PL2', 'TFIDF']; // 需要添加 Tooltip 的列

const shouldShowTooltip = (columnKey) => {
  return tooltipColumns.includes(columnKey);
};

const getTooltipContent = (record) => {
  let model = record;
  if (model) {
    return `<div>Gender: ${model.gender_category}, </div><div>Popularity: ${model.relative_pageviews_category},</div><div>Article Replication: ${model.num_sitelinks_category},</div><div>rank: ${model.rank}</div>`;
  }
  return '';
};
const dataSource = ref([]);

const articleReplicationChartContainer = ref(null);
const popularityChartContainer = ref(null);
const genderChartContainer = ref(null);
const lineChartContainer = ref(null);

let articleReplicationChart, popularityChart, genderChart, lineChart;

const updateArticleReplicationChart = (data = []) => {
  if (articleReplicationChart) {
    articleReplicationChart.changeData(data);
  } else {
    articleReplicationChart = new Chart({
      container: articleReplicationChartContainer.value,
      autoFit: true,
      type: 'view',
    });

    articleReplicationChart
      .interval()
      .attr('padding', 40)
      .data(data)
      .encode('x', 'class')
      .encode('y', 'count')
      .encode('color', 'name')
      .transform({ type: 'dodgeX' })
      .interaction('elementHighlight', { background: true });
  }
};

const updatePopularityChart = (data = []) => {
  if (popularityChart) {
    popularityChart.changeData(data);
  } else {
    popularityChart = new Chart({
      container: popularityChartContainer.value,
      autoFit: true,
      type: 'view',
    });

    popularityChart
      .interval()
      .data(data)
      .encode('x', 'class')
      .encode('y', 'count')
      .encode('color', 'name')
      .transform({ type: 'dodgeX' })
      .interaction('elementHighlight', { background: true });
  }
};

const updateGenderChart = (data = []) => {
  if (genderChart) {
    genderChart.changeData(data);
  } else {
    genderChart = new Chart({
      container: genderChartContainer.value,
      autoFit: true,
      type: 'view',
    });

    genderChart
      .interval()
      .data(data)
      .encode('x', 'class')
      .encode('y', 'count')
      .encode('color', 'name')
      .transform({ type: 'dodgeX' })
      .interaction('elementHighlight', { background: true });
  }
};

const updateLineChart = (data = []) => {
  if (lineChart) {
    lineChart.changeData(data);
  } else {
    lineChart = new Chart({
      container: lineChartContainer.value,
      autoFit: true,
      type: 'view',
    });

    lineChart
      .data(data)
      .encode('x', 'Evaluation index')
      .encode('y', 'value')
      .encode('color', 'model')
      .scale('x', {
        range: [0, 1],
      })
      .scale('y', {
        nice: true,
      })
      .axis('y');

    lineChart.line().encode('shape', 'line');

    lineChart.point().encode('shape', 'point').tooltip(false);
  }
};

function transformData(columnData) {
  const rowData = [];
  const modelName = columnData.BM25 ? 'BM25' : 'model1'; // 本地mock使用model1
  const numEntries = Object.keys(columnData[modelName].docno).length;

  for (let i = 0; i < numEntries; i++) {
    let row = { rank: i + 1 };
    for (const model in columnData) {
      row[model] = {
        docno: columnData[model].docno[i],
        rank: columnData[model].rank[i],
        score: columnData[model].score[i],
        gender_category: columnData[model].gender_category[i],
        relative_pageviews_category: columnData[model].relative_pageviews_category[i],
        num_sitelinks_category: columnData[model].num_sitelinks_category[i],
      };
    }
    rowData.push(row);
  }
  return rowData;
}

function countCategories(data) {
  const results = {};
  for (const model in data) {
    results[model] = {};
    for (const category in data[model]) {
      if (typeof data[model][category] === 'object' && category.includes('category')) {
        for (const key in data[model][category]) {
          const value = data[model][category][key];
          if (!results[model][category]) {
            results[model][category] = {};
          }
          if (!results[model][category][value]) {
            results[model][category][value] = 0;
          }
          results[model][category][value]++;
        }
      }
    }
  }
  console.warn('results', results);
  return results;
}

function formatCategoryCounts(data, categoryName) {
  const formattedResults = [];
  for (const model in data) {
    if (data[model][categoryName]) {
      for (const value in data[model][categoryName]) {
        const count = data[model][categoryName][value];
        formattedResults.push({
          name: model,
          class: value,
          count: count,
        });
      }
    }
  }
  console.warn('formattedResults', formattedResults);
  return formattedResults;
}

function getLineChartData() {
  return [
    { 'Evaluation index': 'MAP', model: 'BM25', value: 0.013967 },
    { 'Evaluation index': 'MAP', model: 'PL2', value: 0.037314 },
    { 'Evaluation index': 'MAP', model: 'F_IDF', value: 0.013984 },
    { 'Evaluation index': 'NDCG', model: 'BM25', value: 0.037062 },
    { 'Evaluation index': 'NDCG', model: 'PL2', value: 0.037314 },
    { 'Evaluation index': 'NDCG', model: 'F_IDF', value: 0.037061 },
  ]
}

const chartCategoryMap = {
  gender: 'gender_category',
  popularity: 'relative_pageviews_category',
  articleReplication: 'num_sitelinks_category',
}

const fetchData = async () => {
  loading.value = true;
  console.log(searchQueryName.value);
  try {
    const response = await axios.get('/mock.json', {
      params: { query: searchQueryName.value },
    });

    const data = transformData(response.data);
    dataSource.value = data || [];

    const categoriesData = countCategories(response.data);

    formatCategoryCounts(categoriesData, chartCategoryMap['articleReplication']);

    updateArticleReplicationChart(formatCategoryCounts(categoriesData, chartCategoryMap['articleReplication']));
    updatePopularityChart(formatCategoryCounts(categoriesData, chartCategoryMap['popularity']));
    updateGenderChart(formatCategoryCounts(categoriesData, chartCategoryMap['gender']));
    updateLineChart(getLineChartData());

  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {

  inputSearch.value.focus();

  updateArticleReplicationChart();
  updatePopularityChart();
  updateGenderChart();
  updateLineChart();
});
</script>

<style scoped>
.chart-container {
  height: calc((100vh - 20px) / 2);
  width: 40vw;
}

/* .page2-chart-container {
  height: calc((100vh - 20px) / 2 - 20px);
  padding: 10px;
  width: 35vw;
}

.line-chart-container {
  height: calc((100vh - 40px - 15vh - 20px) / 2);
  width: 40vw;
} */
</style>
