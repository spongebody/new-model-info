<template>
    <div id="main" style="width: 80vw; height: 600px;"></div>
</template>

<script>
import * as echarts from 'echarts';
import axios from 'axios';

export default {
    name: 'WorldMap',
    mounted() {
        axios.get('https://s3-us-west-2.amazonaws.com/s.cdpn.io/95368/world.json')
            .then((response) => {
                const chinaJson = response.data;
                echarts.registerMap('world', chinaJson);

                const chart = echarts.init(document.getElementById('main'));
                chart.setOption({
                    series: [{
                        type: 'map',
                        map: 'world'
                    }]
                });

            })
            .catch(error => {
                console.error('Error loading the map data:', error);
            });
    }
};
</script>

<style>
#main {
    width: 100%;
    height: 500px;
}
</style>