<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>世界地图</title>
    <script src="https://a.alipayobjects.com/jquery/jquery/1.11.1/jquery.js"></script>
    <script src="https://gw.alipayobjects.com/as/g/datavis/g2/2.3.13/index.js"></script>
  </head>
  <body>
    <div id="c1"></div>
    <script>
      var Frame = G2.Frame;
      var Stat = G2.Stat;
      $.getJSON('../../../static/data/world.geo.json', function(mapData) {
        var userData = [
          {name: 'Russia',value: 86.8},
          {name: 'China',value: 106.3},
          {name: 'Japan',value: 94.7},
          {name: 'Mongolia',value: 98},
          {name: 'Canada',value: 98.4},
          {name: 'United Kingdom',value: 97.2},
          {name: 'United States of America',value: 98.3},
          {name: 'Brazil',value: 96.7},
          {name: 'Argentina',value: 95.8},
          {name: 'Algeria',value: 101.3},
          {name: 'France',value: 94.8},
          {name: 'Germany',value: 96.6},
          {name: 'Ukraine',value: 86.3},
          {name: 'Egypt',value: 102.1},
          {name: 'South Africa',value: 101.3},
          {name: 'India',value: 107.6},
          {name: 'Australia',value: 99.9},
          {name: 'Saudi Arabia',value:130.1},
          {name: 'Afghanistan',value: 106.5},
          {name: 'Kazakhstan',value:93.4},
          {name: 'Indonesia',value: 101.4}
        ];
        var frame = new Frame(userData);
        frame.addCol('trend', function(obj) {
          return (obj.value > 100) ? 1 : 0;
        });
        var map = [];
        var features = mapData.features;
        for(var i=0; i<features.length; i++) {
          var name = features[i].properties.name;
          map.push({
            "name": name
          });
        }
        var chart = new G2.Chart({
          id: 'c1',
          forceFit: true,
          height: 450,
          syncXYScales: true, // 统一视图的度量
          plotCfg: {
            margin: [55, 20]
          }
        });
        chart.tooltip({
          title: null
        });
        chart.legend('trend', {
          position: 'left'
        })
        // 绘制世界地图背景
        var view = chart.createView();
        view.source(map);
        view.tooltip(false);
        view.polygon().position(Stat.map.region('name', mapData)).shape('stroke').style({
          fill: '#fff',
          stroke: '#ccc',
          lineWidth: 1
        });
        // 绘制展示数据
        var userView = chart.createView();
        userView.source(frame, {
          'trend': {
            type: 'cat',
            alias: '每100位女性对应的男性数量',
            values: ['女性更多', '男性更多']
          }
        });
        userView.polygon().position(Stat.map.region('name*value', mapData)).color('trend',['#C45A5A','#14647D']).opacity('value').tooltip('name*trend');
        chart.render();
      });
    </script>
  </body>
</html>
