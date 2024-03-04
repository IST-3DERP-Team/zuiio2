sap.ui.define([ 
    "sap/ui/model/json/JSONModel" ,
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/base/util/uid"
], function(JSONModel,Filter,FilterOperator,uid) {
	"use strict";

	return {        

        updateColumnMenu: function(sTableId, oThis) {
            var _this = this;
            var me = oThis;
            var oTable = me.byId(sTableId);

            if(sTableId === "SPLITIODETTab" || sTableId === "SPLITIODLVTab" || sTableId === "GENINFORECTab" || sTableId === "ADDIOCOLORTab") {
                oTable = sap.ui.getCore().byId(sTableId);
            } else
                oTable = me.byId(sTableId);

            // console.log("updateColumnMenu");
            // console.log(sTableId, oTable);

            oTable.getColumns().forEach(col => {
                // console.log(col);
                // Loop onto each column and attach Column Menu Open event
                col.attachColumnMenuOpen(function(oEvent) {
                    //Get Menu associated with column
                    var oMenu = col.getMenu();   

                    var oMenuItemFilter = new sap.ui.unified.MenuItem({
                        id: col.sId + "-menu-custom-fltr-" + uid(),
                        icon: "sap-icon://filter",
                        text: "Filter",
                        select: function(oEvent) {
                            _this.onColFilter(sTableId, oEvent.getSource().oParent.oParent.getAggregation("label").getProperty("text"), me, true);
                        }
                    })

                    var oMenuItemClearFilter = new sap.ui.unified.MenuItem({
                        id: col.sId + "-menu-clear-fltr-" + uid(),
                        icon: "sap-icon://clear-filter",
                        text: "Clear Filter",
                        enabled: _this.isFiltered(sTableId, col.getProperty("name"), "COL", me),
                        select: function(oEvent) {
                            _this.onColFilter(sTableId, oEvent.getSource().oParent.oParent.getAggregation("label").getProperty("text"), me, false);
                            _this.onRemoveColFilter(oEvent, me);
                            _this.onColFilterConfirm(oEvent, me);
                        }
                    })

                    var oMenuItemClearAllFilter = new sap.ui.unified.MenuItem({
                        id: col.sId + "-menu-clear-all-fltr-" + uid(),
                        icon: "sap-icon://clear-filter",
                        text: "Clear All Filters",
                        enabled: _this.isFiltered(sTableId, col.getProperty("name"), "ALL", me),
                        select: function(oEvent) {
                            _this.onColFilterClear(oEvent, me);
                        }
                    })

                    var oMenuItemClearSort = new sap.ui.unified.MenuItem({
                        id: col.sId + "-menu-clear-sorting-" + uid(),
                        icon: "sap-icon://decline",
                        text: "Clear Sorting",
                        enabled: _this.isSorted(sTableId, col.getProperty("name"), me),
                        select: function(oEvent) {
                            oTable.getBinding().sort(null);
                            oTable.getBinding().sort([]);

                            oTable.getColumns().forEach(col => {
                                if (col.getSorted()) {
                                    col.setSorted(false);
                                }
                            })
                        }
                    })
                   
                    //Create the Menu Item that need to be added
                    setTimeout(() => {
                        var wCustomFilter = false;
                        var iSortIndex = -1;

                        oMenu.getItems().forEach((item, index) => {
                            if (item.sId.indexOf("filter") >= 0) {
                                oMenu.removeItem(item);
                            }

                            if (item.sId.indexOf("desc") >= 0) {
                                iSortIndex = index;
                            }

                            if (item.mProperties.text !== undefined && item.mProperties.text === "Filter") {
                                wCustomFilter = true;
                            }

                            if (item.sId.indexOf("clear-all-fltr") >= 0) {
                                item.setProperty("enabled", _this.isFiltered(sTableId, col.getAggregation("template").getBindingInfo("text").parts[0].path, "ALL", me));
                            }
                            else if (item.sId.indexOf("clear-fltr") >= 0) {
                                item.setProperty("enabled", _this.isFiltered(sTableId, col.getAggregation("template").getBindingInfo("text").parts[0].path, "COL", me));
                            }
                            else if (item.sId.indexOf("clear-sorting") >= 0) {
                                item.setProperty("enabled", _this.isSorted(sTableId, col.getAggregation("template").getBindingInfo("text").parts[0].path, me));
                            }
                        })

                        if (!wCustomFilter) {
                            var iCounter = 0;

                            if (oMenuItemClearSort !== -1) {
                                iCounter++;
                                oMenu.insertItem(oMenuItemClearSort, iSortIndex + iCounter);
                            }
                            
                            iCounter++;
                            oMenu.insertItem(oMenuItemFilter, iSortIndex + iCounter);
                            iCounter++;
                            oMenu.insertItem(oMenuItemClearFilter, iSortIndex + iCounter);
                            iCounter++;
                            oMenu.insertItem(oMenuItemClearAllFilter, iSortIndex + iCounter);
                        }

                        oMenu.setPageSize(oMenu.getItems().length); 
                    }, 10);
                });
            });                
        },

        onColFilter: function(oEvent, sColumnLabel, oThis) {
            var me = oThis;
            // var oDDText = me.getView().getModel("ddtext").getData();
            var sTableId = "";

            if (typeof(oEvent) === "string") {
                sTableId = oEvent;
            }
            else {
                sTableId = oEvent.getSource().data("TableName");
            }

            var sDialogFragmentName = "zuiio2.view.fragments.dialog.GenericFilterDialog";

            if (!me._GenericFilterDialog) {
                me._GenericFilterDialog = sap.ui.xmlfragment(sDialogFragmentName, me);
                me._GenericFilterDialog.setModel(new JSONModel());
                me.getView().addDependent(me._GenericFilterDialog);
            }
            
            var oTable = me.byId(sTableId);
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oFilterValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedItem = sColumnLabel === undefined ? oDialog.getModel().getProperty("/selectedItem") : sColumnLabel;
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var oSearchValues = {}; 
            var aData = [];
            var oColumnValues = {};
            var bFiltered = false;
            var vFilterType = "VLF";

            var oTableColumns = [];
            // console.log("sTableId", sTableId);
            // console.log("me._aColumns[sTableId.replace", me._aColumns[sTableId.replace("Tab","")]);
            var aTableColumns = jQuery.extend(true, [], me._aColumns[sTableId.replace("Tab","")]);
            aTableColumns.forEach((col, idx) => {
                if (!(col.ColumnName === "MANDT" || col.ColumnName === "DOCTYPE" || col.ColumnName === "SHORTTEXT" || col.ColumnName === "INFORECORD" || col.ColumnName === "COMPANY" || col.ColumnName === "CUSTGRP" || col.ColumnName === "PLANMONTH")) {
                    // console.log("col", col);
                    oTableColumns.push(col);
                }
            });

            if(sTableId === "IODETTab" || sTableId === "styleBOMUVTab") {
                if (oTable.getModel() !== undefined) { 
                    // console.log(sTableId, oTable.getModel("DataModel"));
                    aData = jQuery.extend(true, [], oTable.getModel("DataModel").getData().results);
                }
            } else if(sTableId === "styleFabBOMTab" || sTableId === "styleAccBOMTab") {
                // console.log(sTableId, oTable.getModel("DataModel"));
                aData = jQuery.extend(true, [], oTable.getModel("DataModel").getData().results.items);
            } else {
                if (oTable.getModel() !== undefined) { 
                    // console.log(sTableId, oTable.getModel());
                    aData = jQuery.extend(true, [], oTable.getModel().getData().rows)
                }
            }

            // if (oTable.getModel() !== undefined) { 
            //     console.log(oTable.getModel());
            //     if(oTable.getModel().getData().rows !== undefined) {
            //         aData = jQuery.extend(true, [], oTable.getModel().getData().rows) 
            //     }
                
            //     if(oTable.getModel("DataModel").getData() !== undefined) {
            //         aData = jQuery.extend(true, [], oTable.getModel("DataModel").getData().rows) 
            //     }
            // } 

            // console.log("me._colFilters");
            // console.log(me._colFilters);
            // console.log("sTableId", sTableId);
            if (me._colFilters[sTableId] !== undefined) {
                aColumnItems = me._colFilters[sTableId].items;
                oFilterValues = me._colFilters[sTableId].values;
                oFilterCustom = me._colFilters[sTableId].custom;
                vSelectedItem = me._colFilters[sTableId].selectedItem;
                vSelectedColumn = me._colFilters[sTableId].selectedColumn;
            }
            else {
                aColumnItems = undefined;
                oFilterValues = undefined;
                oFilterCustom = undefined;
                vSelectedItem = "";
                vSelectedColumn = "";
            }

            if (sColumnLabel !== undefined) { vSelectedItem = sColumnLabel }

            if (oFilterCustom === undefined) { 
                oFilterCustom = {};
            }        

            if (aColumnItems !== undefined) {
                if (aColumnItems.filter(fItem => fItem.isFiltered === true).length > 0) { bFiltered = true; }
            }

            if (!bFiltered) {
                oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
            }
            else {
                oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
            }

            // console.log("oTableColumns", oTableColumns);

            oTableColumns.forEach((col, idx) => {
                if (col.ColumnName === "CREATEDDT" || col.ColumnName === "UPDATEDDT") { col.DataType = "DATETIME" }                   

                oColumnValues[col.ColumnName] = [];

                aData.forEach(val => {
                    if (val[col.ColumnName] === "" || val[col.ColumnName] === null || val[col.ColumnName] === undefined) { val[col.ColumnName] = "(blank)" }
                    else if (val[col.ColumnName] === true) { 
                        val[col.ColumnName] = "Yes";
                    }
                    else if (val[col.ColumnName] === false) { 
                        val[col.ColumnName] = "No";
                    }

                    if (oColumnValues[col.ColumnName].findIndex(item => item.Value === val[col.ColumnName]) < 0) {
                        if (bFiltered && oFilterValues && oFilterValues[col.ColumnName].findIndex(item => item.Value === val[col.ColumnName]) >= 0) {
                            oFilterValues[col.ColumnName].forEach(item => {
                                if (item.Value === val[col.ColumnName]) {
                                    oColumnValues[col.ColumnName].push({
                                        Value: item.Value,
                                        Selected: item.Selected
                                    })
                                }
                            })
                        }
                        else {
                            oColumnValues[col.ColumnName].push({
                                Value: val[col.ColumnName],
                                Selected: true
                            })
                        }
                    }
                }); 

                oColumnValues[col.ColumnName].sort((a,b) => ((col.DataType === "NUMBER" ? +a.Value : (col.DataType === "DATETIME" ? (a.Value === "(blank)" ? "" : new Date(a.Value)) : a.Value)) > (col.DataType === "NUMBER" ? +b.Value : (col.DataType === "DATETIME" ? (b.Value === "(blank)" ? "" : new Date(b.Value)) : b.Value)) ? 1 : -1));

                col.selected = false;                    

                // console.log("col", col);

                if (!bFiltered) { 
                    if (sColumnLabel === undefined) {
                        if (idx === 0) {
                            vSelectedColumn = col.ColumnName;
                            vSelectedItem = col.ColumnLabel;
                            col.selected = true;
                        }
                    }
                    else {
                        if (vSelectedItem === col.ColumnLabel) { 
                            vSelectedColumn = col.ColumnName;
                            col.selected = true;
                        }
                    }

                    oFilterCustom[col.ColumnName] = {
                        Operator: col.DataType === "STRING" ? "Contains" : "EQ",
                        ValFr: "",
                        ValTo: ""
                    };

                    col.filterType = "VLF";
                    col.isFiltered = false;                        
                }
                else if (bFiltered) {
                    aColumnItems.filter(fItem => fItem.ColumnName === col.ColumnName).forEach(item => {
                        col.filterType = item.filterType;
                        col.isFiltered = item.isFiltered;
                    })

                    if (vSelectedItem === col.ColumnLabel) { 
                        vSelectedColumn = col.ColumnName;
                        vFilterType = col.filterType;
                        col.selected = true;
                        
                        if (col.isFiltered) {
                            oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                        }
                        else {
                            oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                        }
                    }
                }

                col.filterOperator = col.DataType === "STRING" ? "Contains" : "EQ";

                oSearchValues[col.ColumnName] = "";
            })

            // console.log("vSelectedItem", vSelectedItem);
            // console.log("vSelectedColumn");
            // console.log(vSelectedColumn);

            // console.log("oColumnValues");
            // console.log(oColumnValues);
            oDialog.getModel().setProperty("/sourceTabId", sTableId);
            oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
            oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
            oDialog.getModel().setProperty("/reset", false);
            oDialog.getModel().setProperty("/items", oTableColumns);
            oDialog.getModel().setProperty("/values", oColumnValues);
            oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
            oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);            
            oDialog.getModel().setProperty("/search", oSearchValues);            
            oDialog.getModel().setProperty("/custom", oFilterCustom);
            oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
            oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
            oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);
            oDialog.getModel().setProperty("/searchValue", "");
            
            if (show) {
                oDialog.open();
            }

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];

            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);

            var oBtnClear;
            oDialog.getAggregation("buttons").forEach(item => {
                item.getAggregation("customData").forEach(data => {
                    if (data.getProperty("value") === "Clear") { oBtnClear = item; }
                })
            })

            if (bFiltered) { oBtnClear.setEnabled(true); }
            else { oBtnClear.setEnabled(false); }

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                if (oTableColumns.filter(fItem => fItem.ColumnLabel === item.getTitle())[0].isFiltered) { item.setIcon("sap-icon://filter") }
                else { item.setIcon("sap-icon://text-align-justified") }
                // item.setIcon("sap-icon://filter");
            });

            if (vFilterType === "UDF") {
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/selectVLF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);
            }

            var vDataType = oTableColumns.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;
            
            if (vDataType === "BOOLEAN") {
                oDialog.getModel().setProperty("/rbtnUDFVisible", false);
                oDialog.getModel().setProperty("/lblUDFVisible", false);
            }
            else {
                oDialog.getModel().setProperty("/rbtnUDFVisible", true);
                oDialog.getModel().setProperty("/lblUDFVisible", true);
            }

            if (vDataType === "NUMBER") {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Number");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Number");
            }
            else {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Text");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Text");
            }

            if (oFilterCustom[vSelectedColumn].Operator === "BT") {
                oDialog.getModel().setProperty("/panelUDFToVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/panelUDFToVisible", false);
            }

            if (vDataType === "DATETIME") {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", false);
                oDialog.getModel().setProperty("/customColFilterToValVisible", false);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", true);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", true);
            }
            else{
                oDialog.getModel().setProperty("/customColFilterFrValVisible", true);
                oDialog.getModel().setProperty("/customColFilterToValVisible", true);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", false);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", false);
            }

            if (vDataType !== "STRING") {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length > 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(3);
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(2);
                }
            }
            else {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length === 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "Contains", 
                            text: "Contains"
                        }), 2
                    );

                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "NotContains", 
                            text: "Not Contains"
                        }), 3
                    );
                }
            }

            var oDelegateClick = {
                onclick: function (oEvent) {
                    if (oEvent.srcControl.data("FilterType") === "UDF") {
                        oDialog.getModel().setProperty("/panelVLFVisible", false);
                        oDialog.getModel().setProperty("/panelUDFVisible", true);
                    }
                    else {
                        oDialog.getModel().setProperty("/panelVLFVisible", true);
                        oDialog.getModel().setProperty("/panelUDFVisible", false);
                    }
                }
            };

            oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[0].getItems()[0].getContent()[3].addEventDelegate(oDelegateClick);
            oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[0].getItems()[0].getContent()[6].addEventDelegate(oDelegateClick);

            me._GenericFilterDialogModel = jQuery.extend(true, [], oDialog.getModel());
            me._colFilters[sTableId] = jQuery.extend(true, {}, oDialog.getModel().getData());
        },

        onColFilterClear: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var sSourceTabId = oDialog.getModel().getData().sourceTabId;
            oDialog.close();

            var oFilter = "";

            aColumnItems.forEach(item => {
                oColumnValues[item.ColumnName].forEach(val => val.Selected = true)
                item.isFiltered = false;
            })

            me.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");           
            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));

            me.byId(sSourceTabId).getColumns().forEach(col => {                   
                col.setProperty("filtered", false);
            })

            me._colFilters[sSourceTabId] = jQuery.extend(true, {}, oDialog.getModel().getData());
            me.setActiveRowHighlight(sSourceTabId);

            //additonal code
            if (sSourceTabId === "headerTab") {
                var vActiveRec = me.byId(sSourceTabId).getModel().getData().rows.filter((item,index) => index === 0)[0].COSTCOMPCD;

                if (me.getView().getModel("ui").getProperty("/activeComp") !== vActiveRec) {
                    me.byId(sSourceTabId).getModel().getData().rows.forEach(item => {
                        if (item.COSTCOMPCD === vActiveRec) { item.ACTIVE = "X"; }
                        else { item.ACTIVE = ""; }
                    });

                    // me.setActiveRowHighlight(sSourceTabId);
                    me.getView().getModel("ui").setProperty("/activeComp", vActiveRec);
                    me.getView().getModel("ui").setProperty("/activeCompDisplay", vActiveRec);
                    me.getDetailData(false);
                }

                me.getView().getModel("counts").setProperty("/header", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
            }
            else if (sSourceTabId === "detailTab") {
                me.getView().getModel("counts").setProperty("/detail", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
            }
        },

        onColFilterCancel: function(oEvent, oThis) {
            // console.log("onColFilterCancel");
            var me = oThis;
            var oDialogModel = me._GenericFilterDialogModel;
            var oDialog = me._GenericFilterDialog;
            oDialog.getModel().setProperty("/items", oDialogModel.getData().items);
            oDialog.getModel().setProperty("/values", oDialogModel.getData().values);
            oDialog.getModel().setProperty("/currValues", oDialogModel.getData().currValues);
            oDialog.getModel().setProperty("/search", oDialogModel.getData().search);
            oDialog.getModel().setProperty("/custom", oDialogModel.getData().custom);

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                var isFiltered = oDialogModel.getData().items.filter(fItem => fItem.ColumnLabel === item.getTitle())[0].isFiltered;
                // var isFiltered = false;
                
                if (isFiltered) {
                    item.setIcon("sap-icon://filter");
                }
                else {
                    item.setIcon("sap-icon://text-align-justified");
                }
            });

            me._GenericFilterDialog.close();
        },

        onColFilterConfirm: function(oEvent, oThis) {
            // console.log("onColFilterConfirm");
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var sSourceTabId = oDialog.getModel().getData().sourceTabId;
            oDialog.close();

            var aFilter = [];
            var oFilter = null;
            var oSourceTableColumns = me.byId(sSourceTabId).getColumns();
            
            aColumnItems.forEach(item => {
                var oColumn = oSourceTableColumns.filter(fItem => fItem.getAggregation("label").getProperty("text") === item.ColumnLabel)[0];                    
                var aColFilter = [];
                var oColFilter = null;

                if (item.filterType === "VLF" && oColumnValues[item.ColumnName].filter(fItem => fItem.Selected === false).length > 0) {
                    oColumnValues[item.ColumnName].forEach(val => {
                        if (val.Selected) {
                            if (val.Value === "(blank)") {
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), ""));
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), null));
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), undefined));
                            }
                            else if (item.DataType === "BOOLEAN") {
                                if (val.Value === "Yes") {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), true))
                                }
                                else {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), false))
                                }
                            }
                            else {
                                aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), val.Value))
                            }
                        }
                    })

                    oColFilter = new Filter(aColFilter, false);
                    aFilter.push(new Filter(oColFilter));

                    oColumn.setProperty("filtered", true);
                    item.isFiltered = true;
                }
                else if (item.filterType === "UDF" && oFilterCustom[item.ColumnName].ValFr !== "") {
                    if (oFilterCustom[item.ColumnName].ValTo !== "") {
                        aFilter.push(new Filter(item.ColumnName, this.getConnector("BT"), oFilterCustom[item.ColumnName].ValFr, oFilterCustom[item.ColumnName].ValTo));
                    }
                    else {
                        aFilter.push(new Filter(item.ColumnName, this.getConnector(oFilterCustom[item.ColumnName].Operator), oFilterCustom[item.ColumnName].ValFr));
                    }

                    oColumn.setProperty("filtered", true);
                    item.isFiltered = true;
                }
                else {
                    // oColumn.setProperty("filtered", false);
                    item.isFiltered = false;
                }
            })
            
            if (aFilter.length > 0) {
                oFilter = new Filter(aFilter, true);
            }
            else {
                oFilter = "";
            }

            // console.log(oFilter)
            me.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");
            me._colFilters[sSourceTabId] = jQuery.extend(true, {}, oDialog.getModel().getData());

            //additonal code
            if (oFilter !== "") {
                if (sSourceTabId === "headerTab") {
                    if (me.byId(sSourceTabId).getBinding("rows").aIndices.length === 0) {
                        me.getView().getModel("ui").setProperty("/activeComp", '');
                        me.getView().getModel("ui").setProperty("/activeCompDisplay", '');
                        me.getView().getModel("counts").setProperty("/header", 0);
                        me.getView().getModel("counts").setProperty("/detail", 0);

                        me.byId("detailTab").setModel(new JSONModel({
                            rows: []
                        }));
                    }
                    else {
                        var vActiveRec = me.byId(sSourceTabId).getModel().getData().rows.filter((item,index) => index === me.byId(sSourceTabId).getBinding("rows").aIndices[0])[0].COSTCOMPCD;

                        if (me.getView().getModel("ui").getProperty("/activeComp") !== vActiveRec) {
                            me.byId(sSourceTabId).getModel().getData().rows.forEach(item => {
                                if (item.COSTCOMPCD === vActiveRec) { item.ACTIVE = "X"; }
                                else { item.ACTIVE = ""; }
                            });

                            me.setActiveRowHighlight(sSourceTabId);
                            me.getView().getModel("ui").setProperty("/activeComp", vActiveRec);
                            me.getView().getModel("ui").setProperty("/activeCompDisplay", vActiveRec);
                            me.getDetailData(false);
                        }

                        me.getView().getModel("counts").setProperty("/header", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
                    }
                }
                else if (sSourceTabId === "detailTab") {
                    if (me.byId(sSourceTabId).getBinding("rows").aIndices.length === 0) {
                        me.getView().getModel("counts").setProperty("/detail", 0);
                    }
                    else {
                        me.getView().getModel("counts").setProperty("/detail", me.byId(sSourceTabId).getBinding("rows").aIndices.length);
                        me.setActiveRowHighlight(sSourceTabId);
                    }
                }
            }
            else {
                me.getView().getModel("counts").setProperty("/header", me.byId(sSourceTabId).getModel().getData().rows.length);
            }

            // console.log("sSourceTabId", sSourceTabId);
            if(me.getView().byId(sSourceTabId + "Cnt") !== undefined) {
                var oText = me.getView().byId(sSourceTabId + "Cnt");
                oText.setText(me.byId(sSourceTabId).getBinding("rows").aIndices.length + " item/s");
            }
        },

        onFilterItemPress: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedItem = oEvent.getSource().getSelectedItem().getProperty("title");
            var vSelectedColumn = "";

            aColumnItems.forEach(item => {
                if (item.ColumnLabel === vSelectedItem) { 
                    vSelectedColumn = item.ColumnName; 
                    
                    if (item.isFiltered) {
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    }
                    else {
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    }
                }
            })

            oDialog.getModel().setProperty("/currValues", jQuery.extend(true, [], oColumnValues[vSelectedColumn]));
            oDialog.getModel().setProperty("/rowCount", oColumnValues[vSelectedColumn].length);
            oDialog.getModel().setProperty("/selectedItem", vSelectedItem);
            oDialog.getModel().setProperty("/selectedColumn", vSelectedColumn);
            oDialog.getModel().setProperty("/reset", false);
            oDialog.getModel().setProperty("/customColFilterOperator", oFilterCustom[vSelectedColumn].Operator);
            oDialog.getModel().setProperty("/customColFilterFrVal", oFilterCustom[vSelectedColumn].ValFr);
            oDialog.getModel().setProperty("/customColFilterToVal", oFilterCustom[vSelectedColumn].ValTo);
            oDialog.getModel().setProperty("/searchValue", "");

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
            var vDataType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;

            if (vFilterType === "UDF") {
                oDialog.getModel().setProperty("/selectVLF", false);
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/selectUDF", false);
                oDialog.getModel().setProperty("/selectVLF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);
            }

            if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getSelectedKey() === "BT") {
                oDialog.getModel().setProperty("/panelUDFToVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/panelUDFToVisible", false);
            }

            if (vDataType === "BOOLEAN") {
                oDialog.getModel().setProperty("/rbtnUDFVisible", false);
                oDialog.getModel().setProperty("/lblUDFVisible", false);
            }
            else {
                oDialog.getModel().setProperty("/rbtnUDFVisible", true);
                oDialog.getModel().setProperty("/lblUDFVisible", true);
            }

            if (vDataType === "NUMBER") {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Number");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Number");
            }
            else {
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].setType("Text");
                oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].setType("Text");
            }

            if (vDataType === "DATETIME") {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", false);
                oDialog.getModel().setProperty("/customColFilterToValVisible", false);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", true);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", true);
            }
            else {
                oDialog.getModel().setProperty("/customColFilterFrValVisible", true);
                oDialog.getModel().setProperty("/customColFilterToValVisible", true);
                oDialog.getModel().setProperty("/customColFilterFrDateVisible", false);
                oDialog.getModel().setProperty("/customColFilterToDateVisible", false);
            }

            if (vDataType !== "STRING") {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length > 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(3);
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].removeItem(2);
                }
            }
            else {
                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getItems().filter(item => item.getKey() === "Contains").length === 0) {
                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "Contains", 
                            text: "Contains"
                        }), 2
                    );

                    oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].insertItem(
                        new sap.ui.core.Item({
                            key: "NotContains", 
                            text: "Not Contains"
                        }), 3
                    );
                }
            }

            oDialog.getModel().setProperty("/reset", true);
        },

        onFilterValuesSelectionChange: function(oEvent, oThis) { 
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            
            if (oDialog.getModel().getProperty("/reset")) {
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oCurrColumnValues = oDialog.getModel().getProperty("/currValues");
                var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
                var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
                var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
                var bFiltered = false;
                
                oCurrColumnValues.forEach((item, idx) => {
                    if (oTableValues.isIndexSelected(idx)) { 
                        item.Selected = true;
                        oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = true);
                    }
                    else { 
                        bFiltered = true;
                        item.Selected = false;
                        oColumnValues[vSelectedColumn].filter(fItem => fItem.Value === item.Value).forEach(val => val.Selected = false);
                    }
                })

                if (bFiltered) { 
                    oDialog.getModel().setProperty("/selectVLF", true);
                    oDialog.getModel().setProperty("/panelVLFVisible", true);
                    oDialog.getModel().setProperty("/panelUDFVisible", false);
                    aColumnItems.forEach(item => {
                        if (item.ColumnName === vSelectedColumn) {
                            item.filterType = "VLF";
                            item.isFiltered = true;
                        }
                    })
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                }

                var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
                var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

                if (vFilterType === "VLF") {
                    if (bFiltered) {
                        oItem.setIcon("sap-icon://filter");
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    }
                    else {
                        oItem.setIcon("sap-icon://text-align-justified");
                        oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    }
                }
            }
        },

        onSearchFilterValue: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;   
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oCurrColumnValues = []; //oDialog.getModel().getProperty("/currValues");
            var oSearchValues = oDialog.getModel().getProperty("/search");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];
            var sQuery = "";
            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;

            if (typeof(oEvent) === "string") {
                sQuery = oEvent;
            }
            else {
                sQuery = oEvent.getParameter("query");
            }

            if (sQuery) {
                oColumnValues[vSelectedColumn].forEach(val => {
                    if (val.Value.toLocaleLowerCase().indexOf(sQuery.toLocaleLowerCase()) >= 0) {
                        oCurrColumnValues.push(val);
                    }
                })
            }
            else {
                oCurrColumnValues = oColumnValues[vSelectedColumn];
            }

            oSearchValues[vSelectedColumn] = sQuery;
            oDialog.getModel().setProperty("/search", oSearchValues);
            oDialog.getModel().setProperty("/currValues", oCurrColumnValues);
            oDialog.getModel().setProperty("/rowCount", oCurrColumnValues.length);
            oDialog.getModel().setProperty("/reset", false);

            var oCopyCurrColumnValues = jQuery.extend(true, [], oCurrColumnValues)
            oTableValues.clearSelection();

            oCopyCurrColumnValues.forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oCopyCurrColumnValues.length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);
        },

        onCustomColFilterChange: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;

            if (!(oEvent.getSource().getSelectedKey() === undefined || oEvent.getSource().getSelectedKey() === "")) {
                if (oEvent.getSource().getSelectedKey() === "BT") {
                    oDialog.getModel().setProperty("/panelUDFToVisible", true);
                }
                else {
                    oDialog.getModel().setProperty("/panelUDFToVisible", false);
                }
            }

            var aColumnItems = oDialog.getModel().getProperty("/items");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var sOperator = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[0].getSelectedKey();
            var vDataType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].DataType;
            var sValueFr = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].getValue();
            var sValueTo = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[1].getValue();

            if (vDataType === "DATETIME") {
                sValueFr = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[2].getValue();
                sValueTo = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[1].getItems()[2].getValue();
            }

            oFilterCustom[vSelectedColumn].Operator = sOperator;
            oFilterCustom[vSelectedColumn].ValFr = sValueFr;
            oFilterCustom[vSelectedColumn].ValTo = sValueTo;
            oDialog.getModel().setProperty("/custom", oFilterCustom);

            if (sValueFr !== "") { 
                oDialog.getModel().setProperty("/selectUDF", true);
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);
                aColumnItems.forEach(item => {
                    if (item.ColumnName === vSelectedColumn) {
                        item.filterType = "UDF";
                        item.isFiltered = true;
                    }
                })                    
            }

            var vFilterType = aColumnItems.filter(fItem => fItem.ColumnName === vSelectedColumn)[0].filterType;
            var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];

            if (vFilterType === "UDF") {
                if (sValueFr !== "") {
                    oItem.setIcon("sap-icon://filter");
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                }
                else {
                    oItem.setIcon("sap-icon://text-align-justified");
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                }
            }                
        },

        onSetUseColFilter: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");

            aColumnItems.forEach(item => {
                if (item.ColumnName === vSelectedColumn && oEvent.getParameter("selected")) {
                    item.filterType = oEvent.getSource().data("FilterType");
                }
            })

            var oItem = oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().filter(fItem => fItem.getTitle() === vSelectedItem)[0];
            
            if (oEvent.getSource().data("FilterType") === "UDF") {
                oDialog.getModel().setProperty("/panelVLFVisible", false);
                oDialog.getModel().setProperty("/panelUDFVisible", true);

                if (oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[2].getItems()[0].getItems()[1].getValue() !== "" && oEvent.getParameter("selected")) {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    oItem.setIcon("sap-icon://filter");
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    oItem.setIcon("sap-icon://text-align-justified");
                }
            }
            else {
                oDialog.getModel().setProperty("/panelVLFVisible", true);
                oDialog.getModel().setProperty("/panelUDFVisible", false);

                if (oColumnValues[vSelectedColumn].filter(fItem => fItem.Selected === false).length > 0 && oEvent.getParameter("selected")) {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", true);
                    oItem.setIcon("sap-icon://filter");
                }
                else {
                    oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
                    oItem.setIcon("sap-icon://text-align-justified");
                }
            }
        },

        onRemoveColFilter: function(oEvent, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            var aColumnItems = oDialog.getModel().getProperty("/items");
            var oColumnValues = oDialog.getModel().getProperty("/values");
            var oFilterCustom = oDialog.getModel().getProperty("/custom");
            var vSelectedColumn = oDialog.getModel().getProperty("/selectedColumn");
            var vSelectedItem = oDialog.getModel().getProperty("/selectedItem");

            aColumnItems.forEach(item => {
                if (item.ColumnName === vSelectedColumn) {
                    item.isFiltered = false;
                }
            })

            oFilterCustom[vSelectedColumn].ValFr = "";
            oFilterCustom[vSelectedColumn].ValTo = "";
            oDialog.getModel().setProperty("/custom", oFilterCustom);
            oDialog.getModel().setProperty("/customColFilterFrVal", "");
            oDialog.getModel().setProperty("/customColFilterToVal", "");
            
            oColumnValues[vSelectedColumn].forEach(item => item.Selected = true);

            var bAddSelection = false;
            var iStartSelection = -1, iEndSelection = -1;
            var oTableValues = oDialog.getContent()[0].getDetailPages()[0].getContent()[0].getItems()[1].getItems()[0];

            oDialog.getModel().setProperty("/reset", false);
            oTableValues.clearSelection();
            oColumnValues[vSelectedColumn].forEach((row, idx) => {
                if (row.Selected) { 
                    if (iStartSelection === -1) iStartSelection = idx;
                    iEndSelection = idx;
                }
                
                if (!row.Selected || idx === (oColumnValues[vSelectedColumn].length - 1)) {
                    if (iStartSelection !== -1) { 
                        if (!bAddSelection) { oTableValues.setSelectionInterval(iStartSelection, iEndSelection); }
                        else { oTableValues.addSelectionInterval(iStartSelection, iEndSelection); }
                        
                        bAddSelection = true;
                        oDialog.getModel().setProperty("/reset", false);
                    } 

                    iStartSelection = -1;
                    iEndSelection = -1;
                }
            })

            oDialog.getModel().setProperty("/reset", true);
            oDialog.getModel().setProperty("/values", oColumnValues);
            oDialog.getModel().setProperty("/currValues", oColumnValues[vSelectedColumn]);

            oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => {
                if (item.getTitle() === vSelectedItem) {
                    item.setIcon("sap-icon://text-align-justified")
                }
            });

            oDialog.getModel().setProperty("/btnRemoveFilterEnable", false);
        },

        getConnector(args) {
            var oConnector;

            switch (args) {
                case "EQ":
                    oConnector = sap.ui.model.FilterOperator.EQ
                    break;
                case "NE":
                    oConnector = sap.ui.model.FilterOperator.NE
                    break;
                case "GT":
                    oConnector = sap.ui.model.FilterOperator.GT
                    break;
                case "GE":
                    oConnector = sap.ui.model.FilterOperator.GE
                    break; 
                case "LT":
                    oConnector = sap.ui.model.FilterOperator.LT
                    break;
                case "LE":
                    oConnector = sap.ui.model.FilterOperator.LE
                    break;
                case "BT":
                    oConnector = sap.ui.model.FilterOperator.BT
                    break;
                case "Contains":
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
                case "NotContains":
                    oConnector = sap.ui.model.FilterOperator.NotContains
                    break;
                case "StartsWith":
                    oConnector = sap.ui.model.FilterOperator.StartsWith
                    break;
                case "NotStartsWith":
                    oConnector = sap.ui.model.FilterOperator.NotStartsWith
                    break;
                case "EndsWith":
                    oConnector = sap.ui.model.FilterOperator.EndsWith
                    break;
                case "NotEndsWith":
                    oConnector = sap.ui.model.FilterOperator.NotEndsWith
                    break;
                default:
                    oConnector = sap.ui.model.FilterOperator.Contains
                    break;
            }

            return oConnector;
        },

        applyColFilters: function(oThis) {
            // alert("TableFilter.applyColFilters");
            // console.log("TableFilter.applyColFilters");
            var me = oThis;
            var oDialog = me._GenericFilterDialog;

            if (oDialog) {
                // alert("applyColFilters");
                var aColumnItems = oDialog.getModel().getProperty("/items");
                var oColumnValues = oDialog.getModel().getProperty("/values");
                var oFilterCustom = oDialog.getModel().getProperty("/custom");
                var sSourceTabId = oDialog.getModel().getData().sourceTabId;

                // alert(sSourceTabId);
                // console.log("oDialog.getModel()", oDialog.getModel());
    
                var aFilter = [];
                var oFilter = null;
                var oSourceTableColumns = me.byId(sSourceTabId).getColumns();
                
                aColumnItems.forEach(item => {
                    var oColumn = oSourceTableColumns.filter(fItem => fItem.getAggregation("label").getProperty("text") === item.ColumnLabel)[0];                    
                    var aColFilter = [];
                    var oColFilter = null;
    
                    // console.log("aColumnItems.forEach", item);
                    if (item.filterType === "VLF" && oColumnValues[item.ColumnName].filter(fItem => fItem.Selected === false).length > 0) {
                        oColumnValues[item.ColumnName].forEach(val => {
                            if (val.Selected) {
                                if (val.Value === "(blank)") {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), ""));
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), null));
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), undefined));
                                }
                                else if (item.DataType === "BOOLEAN") {
                                    if (val.Value === "Yes") {
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), true))
                                    }
                                    else {
                                        aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), false))
                                    }
                                }
                                else {
                                    aColFilter.push(new Filter(item.ColumnName, this.getConnector("EQ"), val.Value))
                                }
                            }
                        })
    
                        oColFilter = new Filter(aColFilter, false);
                        aFilter.push(new Filter(oColFilter));
    
                        oColumn.setProperty("filtered", true);
                        item.isFiltered = true;
                    }
                    else if (item.filterType === "UDF" && oFilterCustom[item.ColumnName].ValFr !== "") {
                        if (oFilterCustom[item.ColumnName].ValTo !== "") {
                            aFilter.push(new Filter(item.ColumnName, this.getConnector("BT"), oFilterCustom[item.ColumnName].ValFr, oFilterCustom[item.ColumnName].ValTo));
                        }
                        else {
                            aFilter.push(new Filter(item.ColumnName, this.getConnector(oFilterCustom[item.ColumnName].Operator), oFilterCustom[item.ColumnName].ValFr));
                        }
    
                        oColumn.setProperty("filtered", true);
                        item.isFiltered = true;
                    }
                    else {
                        oColumn.setProperty("filtered", false);
                        item.isFiltered = false;
                    }
                })
                
                if (aFilter.length > 0) {
                    oFilter = new Filter(aFilter, true);
                }
                else {
                    oFilter = "";
                }
    
                me.byId(sSourceTabId).getBinding("rows").filter(oFilter, "Application");
                me._colFilters[sSourceTabId] = jQuery.extend(true, {}, oDialog.getModel().getData());
                // alert(me._colFilters);
            }
        },

        removeColFilters: function(sTableId, oThis) {
            var me = oThis;
            var oDialog = me._GenericFilterDialog;
            
            if (me._colFilters[sTableId] !== undefined) {
                if (oDialog) {
                    var aColumnItems = me._colFilters[sTableId].items;
                    var oColumnValues = me._colFilters[sTableId].values;
                    var oFilter = "";

                    aColumnItems.forEach(item => {
                        oColumnValues[item.ColumnName].forEach(val => val.Selected = true)
                        item.isFiltered = false;
                    })

                    me.byId(sTableId).getBinding("rows").filter(oFilter, "Application");           
                    oDialog.getContent()[0].getMasterPages()[0].getContent()[0].getItems().forEach(item => item.setIcon("sap-icon://text-align-justified"));

                    me.byId(sTableId).getColumns().forEach(col => { 
                        col.setProperty("filtered", false);
                    })
                }
            }
        },

        isFiltered: function(sTableId, sColumnName, sType, oThis) {
            var me = oThis;
            var aColumnItems = undefined;
            var bFiltered = false;

            if (me._GenericFilterDialog) {
                if (me._colFilters[sTableId] !== undefined) {
                    aColumnItems = me._colFilters[sTableId].items;

                    if (sType === "ALL") {
                        if (aColumnItems.filter(fItem => fItem.isFiltered === true).length > 0) { bFiltered = true; }
                    }
                    else {
                        if (aColumnItems.filter(fItem => fItem.ColumnName === sColumnName && fItem.isFiltered === true).length > 0) { bFiltered = true; }
                    }
                }
            }

            return bFiltered;
        },

        isSorted: function(sTableId, sColumnName, oThis) {
            var me = oThis;
            var bSorted = false;

            // console.log("isSorted", sTableId, sColumnName);
            // console.log(me.byId(sTableId).getColumns());
            me.byId(sTableId).getColumns().forEach(fItem => {
                // console.log(fItem.getProperty("name"));
            });
            var oColumnProp = me.byId(sTableId).getColumns().filter(fItem => fItem.getProperty("name") === sColumnName)[0];

            if (oColumnProp.getProperty("sorted")) {
                bSorted = true;
            }
            // console.log(oColumnProp)
            return bSorted;
        }
	};
});