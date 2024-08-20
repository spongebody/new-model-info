<template>
  <div class="f-container">
    <h2 style="margin-bottom: 1em">Enter your query</h2>
    <a-input-search
      size="medium"
      v-model:value="searchQueryName"
      @search="fetchData"
      placeholder="please enter your query in there"
      style="margin-bottom: 20px; width: 60%"
    />
    <a-spin :spinning="loading">
      <div class="content" :class="{ 'h-content': dataSource.length <= 0 }">
        <div class="table-container">
          <a-table
            :row-class-name="
              (_record, index) => (index % 2 === 1 ? 'table-striped' : null)
            "
            :dataSource="dataSource"
            :columns="columns"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <a-tooltip v-if="shouldShowTooltip(column.key)">
                <template #title>
                  <span
                    v-if="column.dataIndex === 'BM25'"
                    v-html="getTooltipContent(record['BM25'])"
                  >
                  </span>
                  <span
                    v-else-if="column.dataIndex === 'PL2'"
                    v-html="getTooltipContent(record['PL2'])"
                  >
                  </span>
                  <span
                    v-else-if="column.dataIndex === 'TFIDF'"
                    v-html="getTooltipContent(record['TFIDF'])"
                  >
                  </span>
                </template>
                <span>{{ record[column.dataIndex].docno }}</span>
              </a-tooltip>
              <span v-else>{{ record[column.dataIndex] }}</span>
            </template>
          </a-table>
        </div>
        <div class="chart-container" ref="chartContainer"></div>
      </div>
      <div class="empty-container" v-if="!dataSource.length">
        <a-empty description="暂无数据，请搜索查询。" />
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue';
import axios from 'axios';
import { Chart } from '@antv/g2';

const searchQueryName = ref('');
const loading = ref(false);

const columns = ref([
  {
    title: 'Rank',
    dataIndex: 'rank',
    key: 'rank',
    sorter: (a, b) => a.rank - b.rank,
  },
  //   {
  //     title: 'Score',
  //     dataIndex: 'rfan',
  //     key: 'score',
  //     sorter: (a, b) => a.score - b.score,
  //   },
  { title: 'Model1-BM25', dataIndex: 'BM25', key: 'model1' },
  { title: 'Model2-PL2', dataIndex: 'PL2', key: 'model2' },
  { title: 'Model3-TFIDF', dataIndex: 'TFIDF', key: 'model3' },
]);
const tooltipColumns = ['model1', 'model2', 'model3']; // 需要添加 Tooltip 的列

const shouldShowTooltip = (columnKey) => {
  return tooltipColumns.includes(columnKey);
};

const getTooltipContent = (record) => {
  // 获取与当前列相关的 model 对象
  let model = record;
  //   if (record.model && record.name1 !== undefined) model = record.model;
  //   else if (record.model2 && record.name2 !== undefined) model = record.model2;
  //   else if (record.model3 && record.name3 !== undefined) model = record.model3;

  //   if (model) {
  //     return h('ul', [
  //       h('li', `Class1: ${model.gender_category}`),
  //       h('li', `Class2: ${model.relative_pageviews_category}`),
  //       h('li', `Class3: ${model.num_sitelinks_category}`),
  //       h('li', `Class4: ${model.rank}`),
  //     ]);
  //   }
  if (model) {
    return `<div>gender: ${model.gender_category}, </div><div>pageviews: ${model.relative_pageviews_category},</div><div>num_sitelinks: ${model.num_sitelinks_category},</div><div>rank: ${model.rank}</div>`;
  }
  return '';
};
const dataSource = ref([]);

const chatData = ref([]);

const chartContainer = ref(null);

let chart;

const updateChart = (data = []) => {
  if (chart) {
    chart.changeData(data);
  } else {
    chart = new Chart({
      container: chartContainer.value,
      autoFit: true,
      height: 600,
    });

    chart
      .interval()
      .data(data)
      .encode('x', 'class')
      .encode('y', 'count')
      .encode('color', 'name')
      .transform({ type: 'dodgeX' })
      .interaction('elementHighlight', { background: true });
  }
};

function transformData(columnData) {
  const rowData = [];
  const numEntries = Object.keys(columnData.BM25.docno).length;

  for (let i = 0; i < numEntries; i++) {
    let row = { rank: i + 1 };
    for (const model in columnData) {
      row[model] = {
        docno: columnData[model].docno[i],
        rank: columnData[model].rank[i],
        score: columnData[model].score[i],
        gender_category: columnData[model].gender_category[i],
        relative_pageviews_category:
          columnData[model].relative_pageviews_category[i],
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
      if (
        typeof data[model][category] === 'object' &&
        category.includes('category')
      ) {
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
  return formattedResults;
}

const fetchData = async () => {
  loading.value = true;
  console.log(searchQueryName.value);
  try {
    const response = await axios.get('/search', {
      params: { query: searchQueryName.value },
    });
    const data = transformData(response.data);
    countCategories(response.data);
    dataSource.value = data;

    chatData.value = formatCategoryCounts(
      countCategories(response.data),
      'num_sitelinks_category'
    );
    // chatData.value = [
    //   { name: 'model1', class: 'class1', 个数: 18 },
    //   { name: 'model1', class: 'class2', 个数: 28 },
    //   { name: 'model1', class: 'class3', 个数: 39 },

    //   { name: 'model2', class: 'class1', 个数: 12 },
    //   { name: 'model2', class: 'class2', 个数: 23 },
    //   { name: 'model2', class: 'class3', 个数: 34 },

    //   { name: 'model3', class: 'class1', 个数: 12 },
    //   { name: 'model3', class: 'class2', 个数: 23 },
    //   { name: 'model3', class: 'class3', 个数: 34 },
    // ];

    updateChart(chatData.value);
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  updateChart();
});
</script>

<style>
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(0, 0, 0, 0.87);
  background-color: #f4f4f4;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.f-container {
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.content {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 20px;
  padding: 20px;
  border-radius: 8px;

  color: rgba(0, 0, 0, 0.87);
  max-width: 90vw;
  min-height: 70vh;
  margin: 0 auto;
}

.table-container,
.chart-container {
  width: 45%;
  background-color: #ffffff;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.87);
  min-height: 300px;
  overflow: auto;
}

.h-content {
  opacity: 0;
  position: relative;
}

.empty-container {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
}

body {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgZmlsbD0ibm9uZSI+PHBhdGggc3Ryb2tlPSIjMDAwIiBzdHJva2Utb3BhY2l0eT0iLjA0IiBzdHJva2Utd2lkdGg9Ii41IiBkPSJNLjI1LjI1aDQ3LjV2NDcuNUguMjV6Ii8+PC9zdmc+),
    linear-gradient(to bottom, #0000 40%, rgb(232 232 236));
  background-size: 48px 48px, 100% 100%, 100%;
}
</style>
