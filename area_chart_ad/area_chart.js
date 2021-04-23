'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            const savedSheetName = "D3 DATA (2)"
            const search_data_sheet = "Viewable Impressions vs In View Rate"

            loadSelectedMarks(savedSheetName, search_data_sheet);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


    function loadSelectedMarks(worksheetName, search_data) {
        if (removeEventListener) {
            removeEventListener();
        }

        const worksheet = demoHelpers.getSelectedSheet(worksheetName);
        const worksheet_2 = demoHelpers.getSelectedSheet(search_data);

        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
         for (let i=0; i < worksheets.length; i++){
           console.log(worksheets[i].name)
         }
         var unique_partners = [];
        worksheet_2.getSummaryDataAsync().then(function(sumdata) {
           const worksheetData = sumdata.data;
           for ( let i=0; i < worksheetData.length;i++){
               let partner_name = worksheetData[i][0].value
               if (unique_partners.includes(partner_name)){
                   return null
               } else {
                   unique_partners.push(partner_name)
               }
           }
          return null 
       });
        console.log('unique_partners', unique_partners)

         worksheet.getSummaryDataAsync().then(function(sumdata) {
             const worksheetData = sumdata;
             console.log(worksheetData)

             let newArr = [];
             var dataJson;
             var cols = [];
            let partnerList = {}

             worksheetData.columns.map(d => {
               cols.push(d.fieldName);
             })
             console.log(cols)

             worksheetData.data.map(d => {
                     dataJson = {};
                     for (let i=0; i < cols.length; i++){
                       if (cols[i].includes("SUM(Viewable Impressions)") || cols[i].includes("SUM(Viewable Impressions)")){
                         dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                       } else {
                       dataJson[cols[i]] = d[i].value;
                       }
                     }
                     newArr.push(dataJson)     
                    if (dataJson['Partner'] in partnerList) {
                        return 'none'
                    }   else {
                        partnerList[dataJson['Partner']] = 0
                    }


             });

             let partners = [];
            for (const [key, value] of Object.entries(partnerList))
                partners.push(key)
 
             let filtered_partners = [];
                for ( let i=0; i < unique_partners.length;i++){
                 if (partners.includes(unique_partners[i])){
                     filtered_partners.push(unique_partners[i])
                 } else {
                     console.log('no match')
                 }
             }


             let sums = {};
             let i;

             for (i = 0; i < newArr.length; i++) {

                 var date = newArr[i]["Week Commencing"]
                 var measured_imp = newArr[i]["SUM(Measured Impressions)"]
                 var view_imp = newArr[i]["SUM(Viewable Impressions)"]
                 var view_rate = newArr[i]["AGG(In-View Rate)"]
                 var partner = newArr[i]["Partner"]

                 // var measured_date = measured_imp + '_' + date


                if (date in sums) {
                    sums[date]['view_imp'] += view_imp
                    sums[date]['measured_imp'] += measured_imp
                    sums[date]['view_rate'] += view_rate

                } else {
                    sums[date] = {
                      "partner": partner,
                      "measured_imp": measured_imp,
                      "view_imp": view_imp,
                      "date": date,
                      "view_rate": view_rate
                    }
                }

            }

            var sumsArr = []
            for (const [key, value] of Object.entries(sums))
                sumsArr.push(value)

            sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)

            console.log(sumsArr)
            drawDotChart(sumsArr, filtered_partners);


        });

        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }
        // removeEventListener = worksheet.addEventListener(
        //     tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);

        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }

    function saveSheetAndLoadSelectedMarks(worksheetName) {
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync();
        loadSelectedMarks(worksheetName);
        console.log('hi')

    }

    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        // console.log(worksheets)
        // console.log(worksheet)

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }


    function drawDotChart(arr, partnersArr) {
        $('#wrapper').empty();
        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %Y")
        // const formatDate = d3.timeFormat("%b %d")
        const formatDate2 = d3.timeFormat("%b %d")
        const xAccessor = d => dateParser(d.date)
        const yAccessor = d => d.measured_imp
        const y2Accessor = d => d.view_imp
        const view_rate = d => d.view_rate
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        var area_chart_elem = []
        for (let j=0; j < partnersArr.length ; j++){
            area_chart_elem.push([])
        }
        console.log('partnersArr',partnersArr)
         
      
       for ( let i=0; i < arr.length ; i++){
           for (let j=0; j < partnersArr.length ; j++){
                if (arr[i].partner == partnersArr[j] ){
                    area_chart_elem[j].push(arr[i])
                 
                }
            }
       }
       
       var filtered_arr = []
       for ( let i=0; i < arr.length ; i++){
        for (let j=0; j < partnersArr.length ; j++){
             if (arr[i].partner == partnersArr[j] ){
                filtered_arr.push(arr[i])
             }
         }
        }

        console.log(filtered_arr)

        const width = d3.min([
            window.innerWidth * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.85,
        ])


        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 20,
                right: 50,
                bottom: 20,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)


        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);


            const xxScale = d3.scaleTime()
                .domain(d3.extent(filtered_arr, xAccessor))
                .range([0, dimensions.boundedWidth])

            const xScale = d3.scaleBand()
                .range([0, dimensions.boundedWidth])
                .padding(.99)


        const yScale = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, y2Accessor))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        const y3Scale = d3.scaleLinear()
            .domain(d3.extent(filtered_arr, view_rate))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        function x_gridlines() {
            return d3.axisBottom(xxScale)
                .ticks(0)
        }

        function y_gridlines() {
            return d3.axisLeft(yScale)
                .ticks(5)
        }

        function y2_gridlines() {
            return d3.axisRight(y3Scale)
                .ticks(3)
        }

        bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid")
            .call(y_gridlines()
                .tickSize(-dimensions.boundedWidth)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid_y2")
            .attr("id", "grid_y2")

            // .style("stroke", "url(#svgGradient)")
            .attr("stroke-dasharray", "4px 4px")
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )

        const curve = d3.curveLinear

        function mouseOnBar(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9)
            d3.select(this)
                .style("opacity", 1)
                div.html("Measured Impressions: " + add_commas(Math.round(d.measured_imp)) + "</br>" + "Viewable Impressions: " + add_commas(Math.round(d.view_imp))  + "</br>" + "Date: " + d.date)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutBar(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0.7)
        };

        function mouseOnCircle(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.9)
            d3.select(this)
                .style("opacity", 0.4)
            div.html("View Rate: " + d.view_rate.toFixed(2) + "%")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutCircle(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
            .style("opacity", 0);
        };


        var area = bounds.append("g")
            .attr("class","areas")

            const curve2 = d3.curveBasis


          const path2 = d3.line()
              .x(d => xxScale(xAccessor(d)))
              // .y0(yScale(0))
              .y(d => y3Scale(view_rate(d)))
              .curve(curve)

          const path1 = d3.area()
              .x(d => xxScale(xAccessor(d)))
              .y0(yScale(0))
              .y1(d => y2Scale(y2Accessor(d)))
              .curve(curve)


        area.append("path")
            .datum(filtered_arr)
            .transition()
            .duration(300)
            .attr("opacity",0)
            .attr("id", "area1")
            .attr("class", "area1")
            .transition()
            .duration(900)
            .attr("fill", "#4e79a7")
            .attr("opacity", 1)
            .attr("d", path1)



      area.selectAll(".bar")
        .data(filtered_arr)
        .enter()
        .append("rect")
        .attr("class","bar")
        .attr("fill", "#5EC7EB")
        .attr("opacity", 0.7)
        .attr("x", d => xxScale(xAccessor(d)))
        .attr("y", d => yScale(yAccessor(d)))
        .attr("height", d=> dimensions.boundedHeight - yScale(yAccessor(d)))
        .attr("width", xScale.bandwidth());

        area.selectAll(".bar")
        .on("mouseover", mouseOnBar)
        .on("mouseout", mouseOutBar);

       area.selectAll("circle")
          .data(filtered_arr)
          .enter()
          .append("circle")
          .attr("id", "endPoints")
          .attr("fill", "#7e9096")
          .style("opacity", 0)
          .attr("stroke", "none")
          .attr("cx", d => xxScale(xAccessor(d)))
          .attr("cy", d => y3Scale(view_rate(d)))
          .attr("r",2)

        area.selectAll("circle")
            .on("mouseover", mouseOnCircle)
            .on("mouseout", mouseOutCircle);


        area.append("path")
            .datum(filtered_arr)
            .transition()
            .duration(300)
            .attr("opacity",0)
            .attr("id", "area2")
            .attr("class", "area2")
            .transition()
            .duration(900)
            .attr("fill", "none")
            .attr("stroke","black")
            .attr("opacity", 0.5)
            .attr("stroke-width", "2px")
            .attr("d", path2)




        const remove_zero = d => (d / 1e6) + "M";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(4)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const y2AxisGenerator = d3.axisRight()
            .scale(y3Scale)
            .ticks(3)
            .tickFormat(d => d + "%");

        const y2Axis = bounds.append("g")
            .attr("class","axisLine")
            .attr("id","axisLine_right")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("stroke-dasharray", "4px 4px")
            .attr("opacity","0.8")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const xAxisGenerator = d3.axisBottom()
            .scale(xxScale)
            .ticks(5)
            .tickFormat(formatDate);


        const xAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", " #1b2326")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Measured Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", " #1b2326")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .attr("opacity", 1)
            .html("View Rate")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", " #1b2326")

  if (document.querySelector('input[name="show_hide"]')) {
        document.querySelectorAll('input[name="show_hide"]').forEach((elem) => {
          elem.addEventListener("change", function() {
            var dots = document.getElementById("endPoints");
            var show = document.getElementById("show_icon");
            var right_axis = document.getElementById("axisLine_right");
            var gridlines = document.getElementById("grid_y2");
            var area_2 = document.getElementById("area2");
            var eye_open = document.getElementById("eye_open");
            var eye_shut = document.getElementById("eye_shut");

                if (show.checked == false ){
                  right_axis.style.opacity = "0";
                  gridlines.style.opacity = "0";
                  area_2.style.opacity = "0";
                  dots.style.opacity = "0";
                  area_2.style.transition = "opacity .7s linear";
                  right_axis.style.transition = "opacity .7s linear";
                  gridlines.style.transition = "opacity .7s linear";
                  eye_open.style.display = "none";
                  eye_shut.style.display = "block";
                }

                if (show.checked == true ){
                  right_axis.style.opacity = "0.8";
                  gridlines.style.opacity = "1";
                  area_2.style.opacity = "0.5";
                  dots.style.opacity = "0.6";
                  area_2.style.transition = "opacity .7s linear";
                  right_axis.style.transition = "opacity .7s linear";
                  gridlines.style.transition = "opacity .7s linear";
                  eye_shut.style.display = "none";
                  eye_open.style.display = "block";
                }
          });
        });
      }
    }
})();
