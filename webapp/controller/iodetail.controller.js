sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "../js/Constants",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    'sap/m/MessageStrip',
    "../control/DynamicTable"
],
    /** 
     * @param {typeof sap.ui.core.mvc.Controller} Controller 
     */
    function (Controller, Filter, Common, Utils, Constants, JSONModel, jQuery, HashChanger, MessageStrip, control) {
        "use strict"; 

        var that;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });

        var Core = sap.ui.getCore();

        return Controller.extend("zuiio2.controller.iodetail", {
            onInit: function () {
                that = this; 
                
                //get current userid
                var oModel= new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                this._Model = this.getOwnerComponent().getModel();
                this._Model2 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model3 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteIODetail").attachPatternMatched(this._routePatternMatched, this);                
            },

            _routePatternMatched: function (oEvent) {
                this._ioNo = oEvent.getParameter("arguments").iono; //get Style from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern
                this._styleNo = "";
                this._dataMode = "READ";

                //set all as no changes at first load
                this._headerChanged = false;

                //set Change Status    
                this.setChangeStatus(false);
                
                if (this._ioNo === "NEW") { 
                    //create new - only header is editable at first
                    this.setHeaderEditMode(); 
                    // this.setDetailVisible(false);
                }else {
                    //existing style, get the style data
                    this.cancelHeaderEdit(); 
                    // this.setDetailVisible(true); //make detail section visible
                }
                
                //Load header
                this.getHeaderConfig(); //get visible header fields
                this.getHeaderData(); //get header data

                // build Dynamic table for Attributes
                setTimeout(() => {
                    this.getAttribDynamicTableColumns(); 
                },100);

                //build Dynamic table for Status
                setTimeout(() => {
                    this.getStatDynamicTableColumns(); 
                },100);

                this.initStyle();
            },

            getStatDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();
                
                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model3.setHeaders({
                    sbu: this._sbu,
                    type: 'IOSTAT',
                    tabname: 'ZERP_IOSTATUS'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model3.read("/ColumnsSet", {
                    success: function (oData, oResponse) { 
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "StatDynColumns");  //set the view model
                        // console.log(me.getView().setModel(oJSONColumnsModel, "DynColumns"));  //set the view model
                        setTimeout(() => {
                            me.getStatDynamicTableData(oData.results); 
                        },100);                        
                    },
                    error: function (err) { }
                })
                ;
            },

            getStatDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;  

                var oText = this.getView().byId("StatCount");
                
                oModel.read("/IOSTATSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) { 
                        // oText.setText(oData.Results.length + "");

                        oData.results.forEach(item => {
                            item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                            
                        })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "StatDataModel");
                        // console.log(me.getView().setModel(oJSONDataModel, "DataModel"));
                        setTimeout(() => {
                            me.setStatTableData();
                        },100);                           
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },
            
            setStatTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("StatDynColumns");
                var oDetDataModel = this.getView().getModel("StatDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });
 
                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageStat",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable2 = this.getView().byId("StatDynTable");
                oDetTable2.setModel(oModel);
                
                //bind the dynamic column to the table
                oDetTable2.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType,"Stat"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible ,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });

                //bind the data to the table
                oDetTable2.bindRows("/rows");
            },

            getAttribDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();
                
                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model2.setHeaders({
                    sbu: this._sbu,
                    type: 'IOATTRIB',
                    tabname: 'ZERP_IOATTRIB'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model2.read("/ColumnsSet", {
                    success: function (oData, oResponse) { 
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DynColumns");  //set the view model
                        setTimeout(() => {
                            me.getAttribDynamicTableData(oData.results);
                        },100);                        
                    },
                    error: function (err) { }
                })
                ;
            },

            getAttribDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                var oText = this.getView().byId("AttribCount");
                
                oModel.read("/ATTRIBSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) { 
                        // oText.setText(oData.Results.length + "");

                        // oData.results.forEach(item => {
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);    
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                            
                        // })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DataModel");
                        setTimeout(() => {
                            me.setAttribTableData();
                        },100);
                        
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },
            
            setAttribTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("DynColumns");
                var oDetDataModel = this.getView().getModel("DataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });
 
                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageAttrib",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable = this.getView().byId("AttribDynTable");
                oDetTable.setModel(oModel);
                
                //bind the dynamic column to the table
                oDetTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType,"Attrib"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible ,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });

                //bind the data to the table
                oDetTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType, sSource) {
                var oDetColumnTemplate;
                
                //different component based on field
                // if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                //     oDetColumnTemplate = new sap.tnt.InfoLabel({
                //         text: "{" + sColumnId + "}",
                //         colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : 1}"
                //     })
                // } else 
                if (sColumnType === "SEL") { //Manage button
                    var tToolTip;
                    var sKey;
                    if(sSource === "Attrib") {
                        tToolTip = "Manage this Attribute"
                        sKey ="VERNO"
                    } else if(sSource === "Stat") {
                        tToolTip = "Manage this Status"
                        sKey ="STATUSCD"
                    }
                    oDetColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost",
                        // press: this.goToDetail,                        
                        tooltip: tToolTip
                    });
                    oDetColumnTemplate.data("VERNO", "{}"); //custom data to hold style number
                } 
                else {
                    oDetColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}" }); //default text
                }
                
                oDetColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}" }); //default text
                return oDetColumnTemplate;
            },

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '7';
                if (sColumnType === "SEL") {
                    mSize = '3.5rem';
                } else if (sColumnType === "COPY") {
                    mSize = '3.5rem';
                } else if (sColumnId === "STYLECD") {
                    mSize = '25rem';
                } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                    mSize = '15rem';
                } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                    mSize = '30rem';
                }
                return mSize;
            },

            getFormatColumnSize: function (sColumnId, sColumnType, sColumnSize) {
                //column width of fields
                var mSize = sColumnSize;
                if (sColumnType === "SEL") {
                    mSize = '30';
                } else if (sColumnType === "COPY") {
                    mSize = '30';
                } 
                // else if (sColumnId === "STYLECD") {
                //     mSize = '25';
                // } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                //     mSize = '15';
                // } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                //     mSize = '30';
                // }
                return mSize;
            },

            getHeaderConfig: function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var oJSONModel = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: 'IOHDR',
                    userid: this._userid
                });
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        var visibleFields = new JSONModel();
                        var visibleFields = {};
                        //get only visible fields
                        for (var i = 0; i < oData.results.length; i++) {
                            visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                        }
                        var JSONdata = JSON.stringify(visibleFields);
                        var JSONparse = JSON.parse(JSONdata);
                        oJSONModel.setData(JSONparse);
                        oView.setModel(oJSONModel, "VisibleFieldsData");
                    },
                    error: function (err) { }
                });

            },

            setChangeStatus: function(changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch(err) {}
            },

            getHeaderData: function () {
                var me = this;
                var ioNo = this._ioNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                //read Style header data
                var entitySet = "/IOHDRSet('" + ioNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {

                        // oData.results.forEach(item => {
                        //     // item.CUSTDLVDT = dateFormat.format(item.CUSTDLVDT);
                        //     // item.REVCUSTDLVDT = dateFormat.format(item.REVCUSTDLVDT);
                        //     // item.REQEXFTYDT = dateFormat.format(item.REQEXFTYDT);                            
                        //     // item.MATETA = dateFormat.format(item.MATETA);
                        //     // item.MAINMATETA = dateFormat.format(item.MAINMATETA);
                        //     // item.SUBMATETA = dateFormat.format(item.SUBMATETA);
                        //     // item.CUTMATETA = dateFormat.format(item.CUTMATETA);
                        //     // item.PLANDLVDT = dateFormat.format(item.PLANDLVDT);
                        //     // item.PRODSTART = dateFormat.format(item.PLANDLVDT);
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                           
                        // })

                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        // console.log(oView);
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                        me._styleNo = oData.STYLENO;
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setHeaderEditMode: function () {
                //unlock editable fields of style header
                var oJSONModel = new JSONModel();
                var data = {};
                this._headerChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "HeaderEditModeModel"); 
            },

            // setDetailVisible: function(bool) {
            //     var detailPanel = this.getView().byId('detailPanel'); //show detail section if there is header info
            //     detailPanel.setVisible(bool);
            // },

            cancelHeaderEdit: function () {
                //confirm cancel edit of style header
                if (this._headerChanged) {
                    if (!this._DiscardHeaderChangesDialog) {
                        this._DiscardHeaderChangesDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.DiscardHeaderChanges", this);
                        this.getView().addDependent(this._DiscardHeaderChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardHeaderChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardHeaderChangesDialog.open();
                } else {
                    this.closeHeaderEdit();
                }
            },

            closeHeaderEdit: function () {
                //on cancel confirmed - close edit mode and reselect backend data
                var oJSONModel = new JSONModel();
                var data = {};
                that._headerChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "HeaderEditModeModel");
                if (that._DiscardHeaderChangesDialog) {
                    that._DiscardHeaderChangesDialog.close();
                    that.getHeaderData();
                }
                var oMsgStrip = that.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);
            },

            //******************************************* */
            // STYLE
            //******************************************* */

            initStyle() {
                this._oModelStyle = this.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                this._aColumns = {};
                this._aDataBeforeChange = [];
                var me = this;

                this.byId("colorTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("processTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("sizeTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("styleDetldBOMTab")
                    .setModel(new JSONModel({
                        columns: []
                    }));

                this.byId("styleMatListTab")
                .setModel(new JSONModel({
                    columns: [],
                    rows: []
                }));

                //pivot arrays
                this._colors;
                this._sizes;
                this._styleVer = "";

                this.getStyleHeaderData();
                this.getStyleDetailedBOM();
                this.getStyleMaterialList();
                this.getStyleColors();

                var vIONo = "1000115";
                this._oModelStyle.read('/AttribSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'COLOR'"
                    },
                    success: function (oData, response) {
                        me.byId("colorTab").getModel().setProperty("/rows", oData.results);
                        me.byId("colorTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/ProcessSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        me.byId("processTab").getModel().setProperty("/rows", oData.results);
                        me.byId("processTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/AttribSet', { 
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                    },
                    success: function (oData, response) {
                        me.byId("sizeTab").getModel().setProperty("/rows", oData.results);
                        me.byId("sizeTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })         

                this._oModelStyle.read('/UVSet', { 
                    success: function (oData, response) {
                        me.getView().setModel(new JSONModel(oData), "UVModel");
                    },
                    error: function (err) { }
                }) 

                //get column value help prop
                this.getStyleColumnProp();

                var oDDTextParam = [], oDDTextResult = {};
                var oJSONModelDDText = new JSONModel();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});  
                oDDTextParam.push({CODE: "INFO_NO_DATA_EDIT"});  
                oDDTextParam.push({CODE: "COLORS"});
                oDDTextParam.push({CODE: "PROCESSES"});  
                oDDTextParam.push({CODE: "SIZE"});  
                oDDTextParam.push({CODE: "DTLDBOM"});  
                oDDTextParam.push({CODE: "BOMBYUV"});  
                oDDTextParam.push({CODE: "MATLIST"});  
                oDDTextParam.push({CODE: "EDIT"});  
                oDDTextParam.push({CODE: "SAVE"});  
                oDDTextParam.push({CODE: "CANCEL"});  
                oDDTextParam.push({CODE: "MANAGESTYLE"});  
                oDDTextParam.push({CODE: "NEW"});  
                oDDTextParam.push({CODE: "STYLEHDR"}); 
                oDDTextParam.push({CODE: "PARTCD"}); 
                oDDTextParam.push({CODE: "PARTDESC"}); 
                oDDTextParam.push({CODE: "MATTYP"}); 
                oDDTextParam.push({CODE: "GMC"}); 
                oDDTextParam.push({CODE: "GMCDESC"}); 
                oDDTextParam.push({CODE: "USGCLS"}); 
                oDDTextParam.push({CODE: "SEQNO"}); 
                oDDTextParam.push({CODE: "BOMITEM"}); 
                oDDTextParam.push({CODE: "MATTYPCLS"}); 
                oDDTextParam.push({CODE: "CONSUMP"}); 
                oDDTextParam.push({CODE: "WASTAGE"}); 
                oDDTextParam.push({CODE: "COLORCD"}); 
                oDDTextParam.push({CODE: "ATTRIBUTE"}); 
                oDDTextParam.push({CODE: "SIZECD"}); 
                oDDTextParam.push({CODE: "SIZEGRP"}); 
                oDDTextParam.push({CODE: "POCOLOR"}); 
                oDDTextParam.push({CODE: "DESC"}); 
                oDDTextParam.push({CODE: "USGCLS"}); 
                oDDTextParam.push({CODE: "INFO_CHECK_INVALID_ENTRIES"}); 
                oDDTextParam.push({CODE: "INFO_NO_DATA_MODIFIED"}); 
                oDDTextParam.push({CODE: "INFO_DATA_SAVE"}); 
                
                setTimeout(() => {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                        method: "POST",
                        success: function(oData, oResponse) {        
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDTextResult[item.CODE] = item.TEXT;
                            })
                            
                            oJSONModelDDText.setData(oDDTextResult);
                            me.getView().setModel(oJSONModelDDText, "ddtext");
                            me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({oDDTextResult})
                        },
                        error: function(err) {
                            // sap.m.MessageBox.error(err);
                        }
                    });                    
                }, 100);

                console.log(this.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV"))
            },

            getStyleHeaderData() {
                var me = this;
                var aStyleHdr = [];
                var oJSONModel = new JSONModel();
                var vStyle = "1000000272";
                
                setTimeout(() => {
                    this._oModelStyle.read('/HeaderSet', { 
                        urlParameters: {
                            "$filter": "STYLENO eq '" + vStyle + "'"
                        },
                        success: function (oData, response) {
                            me._styleVer = oData.results[0].VERNO;

                            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                            var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;
                            // console.log(oData)
                            oModel.setHeaders({
                                sbu: vSBU,
                                type: "IOSTYLHDR",
                                tabname: "ZERP_STYLHDR"
                            });
            
                            oModel.read("/ColumnsSet", {
                                success: function (oDataCols, oResponse) {
                                    if (oDataCols.results.length > 0) {
                                        me._aColumns["header"] = oData.results;
                                        
                                        oDataCols.results.forEach(item => {
                                            aStyleHdr.push({ 
                                                KEY: item.ColumnName, 
                                                LABEL: item.ColumnLabel,
                                                VALUE: oData.results[0][item.ColumnName], 
                                                VISIBLE: item.Visible});
                                        })
    
                                        // Object.keys(oData.results[0]).forEach(key => {
                                        //     oDataCols.results.filter(fItem => fItem.ColumnName === key)
                                        //         .forEach(item => aStyleHdr.push({KEY: key, VALUE: oData.results[0][key], VISIBLE: item.Visible}))
                                        // })
    
                                        oJSONModel.setData(aStyleHdr);
                                        me.getView().setModel(oJSONModel, "styleHeader");
                                    }
                                },
                                error: function (err) { }
                            });
                        },
                        error: function (err) { }
                    })                    
                }, 100);
            },

            getStyleColumnProp: async function() {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");
    
                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);
    
                var oColumns = oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getStyleDynamicColumns("IOCOLOR", "ZERP_IOATTRIB", "colorTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOPROCESS", "ZERP_IOPROC", "processTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSIZE", "ZERP_IOATTRIB", "sizeTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLMATLIST", "ZERP_S_STYLMATLST", "styleMatListTab", oColumns);
                }, 100);  

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleDetldBOMTab", oColumns);
                }, 100);
            },

            getStyleDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = "VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp )
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setStyleTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setStyleTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);
                
                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({text: sColumnLabel}),
                        template: new sap.m.Text({ 
                            text: sTabId === "styleDetldBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}", 
                            wrapping: false, 
                            tooltip: sTabId === "styleDetldBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}"
                        }),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });
            },

            getStyleDetailedBOM: function () {
                //get detailed bom data
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var oJSONModel = new JSONModel();
                var oTable = this.getView().byId("styleDetldBOMTab");
                var rowData = {
                    items: []
                };
                var data = {results: rowData};
                oModel.setHeaders({
                    styleno: "1000000272", //this._styleNo,
                    verno: "1" //this._version
                });
                var entitySet = "/StyleDetailedBOMSet"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        var aData = [];
                        // console.log(oData)
                        oData.results.forEach(item => {
                            var oTmpData = {};

                            Object.keys(oData.results[0]).forEach(key => {
                                oTmpData[key.toUpperCase()] = item[key];
                            })

                            aData.push(oTmpData);
                        })
                        // console.log(aData)
                        //build the tree table based on selected data
                        var style, gmc, partcd;
                        var item = {};
                        var item2 = {};
                        var items = [];
                        var items2 = [];

                        for (var i = 0; i < aData.length; i++) {
                            if (aData[i].BOMITMTYP === Constants.STY) { //highest level is STY

                                item = aData[i];
                                items = [];
                                style = aData[i].BOMSTYLE;

                                //add GMC items under the Style, add as child
                                for (var j = 0; j < aData.length; j++) {
                                    if (aData[j].BOMITMTYP === Constants.GMC && aData[j].BOMSTYLE === style) {
                                        
                                        items2 = [];
                                        item2 = aData[j];
                                        gmc = aData[j].GMC;
                                        partcd = aData[j].PARTCD;

                                        //add MAT items under the GMC, add as child
                                        for (var k = 0; k < aData.length; k++) {
                                            if (aData[k].BOMITMTYP === Constants.MAT && oDataaData[k].GMC === gmc && aData[k].PARTCD === partcd) {
                                                items2.push(aData[k]);
                                            }
                                        }

                                        item2.items = items2;
                                        items.push(item2);
                                    }
                                }

                                item.items = items;
                                rowData.items.push(item);

                            } else if (aData[i].BOMITMTYP === Constants.GMC && aData[i].BOMSTYLE === '') { 
                                //for GMC type, immediately add item
                                items = [];
                                item = aData[i];
                                gmc = aData[i].GMC;
                                partcd = aData[i].PARTCD;

                                //add MAT items under the GMC, add as child
                                for (var k = 0; k < aData.length; k++) {
                                    if (aData[k].BOMITMTYP === Constants.MAT && aData[k].GMC === gmc && aData[k].PARTCD === partcd) {
                                        items.push(aData[k]);
                                    }
                                }

                                item.items = items;
                                rowData.items.push(item);
                            }
                        }
                        // console.log(rowData)
                        // console.log(data)
                        oJSONModel.setData(data);
                        oTable.setModel(oJSONModel, "DataModel");

                        // me.byId("styleDetldBOMTab").getModel().setProperty("/rows", data);
                        // me.byId("styleDetldBOMTab").bindRows("/rows");
                    },
                    error: function () { 
                    }
                })
            },

            getStyleMaterialList: function () {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var me = this;

                oModel.setHeaders({
                    styleno: "1000000272", //this._styleNo,
                    verno: "1" //this._version
                });

                oModel.read('/StyleMaterialListSet', { 
                    success: function (oData, response) {
                        // console.log(oData)
                        var aData = [];

                        oData.results.forEach(item => {
                            var oTmpData = {};

                            Object.keys(oData.results[0]).forEach(key => {
                                oTmpData[key.toUpperCase()] = item[key];
                            })

                            aData.push(oTmpData);
                        })

                        // me.byId("styleMatListTab").setVisibleRowCount(aData.length);
                        me.byId("styleMatListTab").getModel().setProperty("/rows", aData);
                        me.byId("styleMatListTab").bindRows("/rows");
                    },
                    error: function (err) { }
                })
            },

            getStyleColors: function () {
                //get color attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                oModel.setHeaders({
                    styleno: "1000000272" //this._styleNo
                });
                oModel.read("/StyleAttributesColorSet", {
                    success: function (oData, oResponse) {
                        me._colors = oData.results;
                        me.getStyleSizes();
                    },
                    error: function (err) { }
                });
            },

            getStyleSizes: function () {
                //get sizes attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                oModel.setHeaders({
                    styleno: "1000000272" //this._styleNo
                });
                oModel.read("/StyleAttributesSizeSet", {
                    success: function (oData, oResponse) {
                        me._sizes = oData.results;
                        me.getStyleBOMUV();
                        // setTimeout(() => {
                        //     me.getStyleDynamicColumns("IOSTYLBOMUV", "ZERP_STYLBOMUV", "styleBOMUVTab", {});
                        // }, 100); 
                    },
                    error: function (err) { }
                });
            },

            getStyleBOMUV: function() {
                //get BOM by UV 
                var me = this;
                var columnData = [];
                var oModelUV = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();
                // console.log(usageClass)
                oModelUV.setHeaders({
                    sbu: "VER", //this._sbu,
                    type: "IOSTYLBOMUV",
                    usgcls: usageClass
                });

                var pivotArray;
                if(usageClass === Constants.AUV) { //for AUV, pivot will be colors
                    pivotArray = me._colors;
                } else {
                    pivotArray = me._sizes;
                }

                //get dynamic columns of BOM by UV
                oModelUV.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(oData.results)
                        var columns = oData.results;
                        var pivotRow;
                        //find the column to pivot
                        for (var i = 0; i < columns.length; i++) {
                            if(columns[i].Pivot !== '') {
                                pivotRow = columns[i].Pivot;
                            }
                        }
                        //build the table dyanmic columns
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot === pivotRow) {
                                //pivot the columns
                                for (var j = 0; j < pivotArray.length; j++) {
                                    columnData.push({
                                        "ColumnName": pivotArray[j].Attribcd,
                                        "ColumnDesc": pivotArray[j].Desc1,
                                        "ColumnWidth": 125,
                                        "ColumnType": pivotRow,
                                        "Editable": false,
                                        "Mandatory": false,
                                        "Visible": true,
                                        "Sorted": false,
                                        "SortOrder": "ASC"
                                    })
                                }
                            } else {
                                if(columns[i].ColumnName !== pivotRow) {
                                    if(columns[i].Visible === true) {
                                        columnData.push({
                                            "ColumnName": columns[i].ColumnName,
                                            "ColumnDesc": columns[i].ColumnName,
                                            "ColumnWidth": columns[i].ColumnWidth,
                                            "ColumnType": columns[i].ColumnType,
                                            "Editable": columns[i].Editable,
                                            "Mandatory": columns[i].Mandatory,
                                            "Sorted": columns[i].Sorted,
                                            "SortOrder": columns[i].SortOrder
                                        })
                                    }
                                }
                            }
                        }

                        me.getBOMUVTableData(columnData, pivotArray);
                    },
                    error: function (err) { 
                        Common.closeLoadingDialog(that);
                    }
                });
            },

            getBOMUVTableData: function (columnData, pivot) {
                //Get BOM by UV actual data
                var me = this;
                var oTable = this.getView().byId("styleBOMUVTab");
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();

                oModel.setHeaders({
                    styleno: "1000000272", //this._styleNo,
                    verno: "1", //this._version,
                    usgcls: usageClass
                });
                oModel.read("/StyleBOMUVSet", {
                    success: function (oData, oResponse) {
                        var rowData = oData.results;
                        // console.log(rowData)
                        //Get unique items of BOM by UV
                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.GMC === rowData.GMC && t.PARTCD === rowData.PARTCD && t.MATTYPCLS === rowData.MATTYPCLS)));

                        //For every unique item
                        for (var i = 0; i < unique.length; i++) {

                            //Set the pivot column for each unique item
                            for (var j = 0; j < rowData.length; j++) {
                                if(rowData[j].DESC1 !== "") {                                
                                    if (unique[i].GMC === rowData[j].GMC && unique[i].PARTCD === rowData[j].PARTCD && unique[i].MATTYPCLS === rowData[j].MATTYPCLS) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].Attribcd;
                                            if (rowData[j].COLOR === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            } else if (rowData[j].SZE === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        //set the table columns/rows
                        rowData = oData.results;
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0) sColumnWidth = 100;
                            
                            return new sap.ui.table.Column({
                                id: "styleBOMUVCol" + column.ColumnName,
                                label: new sap.m.Text({text: me.getStyleColumnDesc("styleBOMUVTab", column)}),
                                template: me.styleColumnTemplate('UV',column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                hAlign: column.ColumnName === "SEQNO" || column.ColumnName === "CONSUMP" || column.ColumnName === "WASTAGE" ? "End" : "Begin",
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending" )
                            });
                        });
                        oTable.bindRows("DataModel>/results");

                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) { 
                        Common.closeLoadingDialog(me);
                    }
                });
            },

            getStyleColumnDesc: function (arg1, arg2) {
                var desc;
                var sTabId = arg1;
                var oColumn = arg2;

                // console.log(this.getView().getModel("ddtext").getData())
                if (sTabId === "styleBOMUVTab") {
                    if (oColumn.ColumnType === Constants.COLOR || oColumn.ColumnType === Constants.SIZE) desc = oColumn.ColumnDesc;
                    else desc = this.getView().getModel("ddtext").getData()[oColumn.ColumnName];
                }
                else if (sTabId === "colorTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["COLORCD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "CPOATRIB") desc = this.getView().getModel("ddtext").getData()["POCOLOR"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "sizeTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["SIZECD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "ATTRIBGRP") desc = this.getView().getModel("ddtext").getData()["SIZEGRP"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "processTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["ATTRIBUTE"];
                    else desc = oColumn.ColumnLabel;
                }
                else desc = oColumn.ColumnLabel;
                

                return desc;
            },

            styleColumnTemplate: function (type, column) {
                //set the column template based on gynamic fields
                var columnName = column.ColumnName;
                var oColumnTemplate;

                oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: false, tooltip: "{DataModel>" + columnName + "}" });  
                return oColumnTemplate;
            },

            getStyleColumnSize: function (oColumn) {
                //column width of fields
                var mSize = '8rem';
                if (oColumn.ColumnName === "GMCDESC") {
                    mSize = '28rem';
                } else if (oColumn.ColumnName === "PARTDESC") {
                    mSize = '16rem';
                }
                return mSize;
            },

            onEdit(arg) {
                if (arg === "color") this._bColorChanged = false;
                if (arg === "process") this._bProcessChanged = false;

                if (this.byId(arg + "Tab").getModel().getData().rows.length === 0) {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                }
                else {
                    if (arg === "color") {
                        this.byId("btnEditColor").setVisible(false);
                        this.byId("btnSaveColor").setVisible(true);
                        this.byId("btnCancelColor").setVisible(true);
                    }
                    else if (arg === "process") {
                        this.byId("btnEditProcess").setVisible(false);
                        this.byId("btnSaveProcess").setVisible(true);
                        this.byId("btnCancelProcess").setVisible(true);
                    }
    
                    this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                    this.setRowEditMode(arg);
                    this._validationErrors = [];
                    this._sTableModel = arg;
                    this._dataMode = "EDIT";

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));

                    var oIconTabBarStyle = this.byId("itbStyleDetail");
                    oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));
    
                }
            },

            onCancel(arg) {
                var bChanged = false;
                
                if (arg === "color") bChanged = this._bColorChanged;
                else if (arg === "process") bChanged = this._bProcessChanged;
                
                if (bChanged) {
                    var oData = {
                        Action: "update-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                    }
                    
                    var oJSONModel = new JSONModel();
                    oJSONModel.setData(oData);
                    
                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDialog", this);
    
                        this._ConfirmDialog.setModel(oJSONModel);
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(oJSONModel);
                        
                    this._ConfirmDialog.open();
                }
                else {
                    if (arg === "color") {
                        this.byId("btnEditColor").setVisible(true);
                        this.byId("btnSaveColor").setVisible(false);
                        this.byId("btnCancelColor").setVisible(false);
                    }
                    else if (arg === "process") {
                        this.byId("btnEditProcess").setVisible(true);
                        this.byId("btnSaveProcess").setVisible(false);
                        this.byId("btnCancelProcess").setVisible(false);                    
                    }
    
                    this.setRowReadMode(arg);
                    this.byId(arg + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(arg + "Tab").bindRows("/rows");
                    this._dataMode = "READ";

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                    var oIconTabBarStyle = this.byId("itbStyleDetail");
                    oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                }
            },

            onSave(arg) {
                var me = this;
                var aEditedRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.EDITED === true);
                var iEdited = 0;
                console.log(arg)
                if (aEditedRows.length > 0) {
                    if (this._validationErrors.length === 0) {
                        aEditedRows.forEach(item => {
                            var entitySet = "/" + (arg === "color" ? "AttribSet" : "ProcessSet") + "(";
                            var param = {};
                            var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;

                            this._aColumns[arg].forEach(col => {
                                if (col.Editable) param[col.ColumnName] = item[col.ColumnName]

                                if (iKeyCount === 1) { 
                                    if (col.Key === "X") entitySet += "'" + item[col.ColumnName] + "'" 
                                }
                                else if (iKeyCount > 1) { 
                                    if (col.Key === "X") entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                }
                            })
                            
                            if (iKeyCount > 1) entitySet = entitySet.substr(0, entitySet.length - 1);
                            entitySet += ")";

                            Common.openProcessingDialog(me, "Processing...");
                            console.log(entitySet, param)
                            setTimeout(() => {
                                this._oModelStyle.update(entitySet, param, {
                                    method: "PUT",
                                    success: function(data, oResponse) {
                                        iEdited++;
    
                                        if (iEdited === aEditedRows.length) {
                                            Common.closeProcessingDialog(me);
                                            Common.showMessage(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                            if (arg === "color") {
                                                me.byId("btnEditColor").setVisible(true);
                                                me.byId("btnSaveColor").setVisible(false);
                                                me.byId("btnCancelColor").setVisible(false);
                                            }
                                            else if (arg === "process") {
                                                me.byId("btnEditProcess").setVisible(true);
                                                me.byId("btnSaveProcess").setVisible(false);
                                                me.byId("btnCancelProcess").setVisible(false);
                                            }
    
                                            var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                            oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                            var oIconTabBarStyle = me.byId("itbStyleDetail");
                                            oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));

                                            me.byId(arg + "Tab").getModel().getData().rows.forEach((row,index) => {
                                                me.byId(arg + "Tab").getModel().setProperty('/' + index + '/EDITED', false);
                                            })
                                            console.log()
                                            me._dataMode = "READ";
                                        }
                                    },
                                    error: function() {
                                        iEdited++;
                                        // alert("Error");
                                        if (iEdited === aEditedRows.length) Common.closeProcessingDialog(me);
                                    }
                                });
                            }, 100)
                        })

                        this.setRowReadMode(arg);
                    }
                    else {
                        Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);    
                    }
                }
                else {
                    Common.showMessage(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                }
            },

            setRowEditMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var me = this;

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;
    
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    
                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                            if (oValueHelp) {
                                col.setTemplate(new sap.m.Input({
                                    type: "Text",
                                    value: "{" + sColName + "}",
                                    showValueHelp: true,
                                    valueHelpRequest: this.handleValueHelp.bind(this),
                                    showSuggestion: true,
                                    maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                    suggestionItems: {
                                        path: ci.ValueHelp["SuggestionItems"].path,
                                        length: 10000,
                                        template: new sap.ui.core.ListItem({
                                            key: ci.ValueHelp["SuggestionItems"].text, 
                                            text: ci.ValueHelp["SuggestionItems"].text,
                                            additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                        }),
                                        templateShareable: false
                                    },
                                    // suggest: this.handleSuggestion.bind(this),
                                    change: this.handleValueHelpChange.bind(this)
                                }));
                            }
                            else if (ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Input({
                                    type: sap.m.InputType.Number,
                                    textAlign: sap.ui.core.TextAlign.Right,
                                    value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                    change: this.onNumberChange.bind(this)
                                }));
                            }
                        })
                })
    
                // this.getView().getModel(arg).getData().forEach(item => item.EDITED = false);
                var vIONo = "1000115";

                if (arg === "color") {
                    this._oModelStyle.read('/CustColorSet', { 
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "CUSTCOLOR_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "process") {
                    this._oModelStyle.read('/AttribTypeSet', { 
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "ATTRIBTYPE_MODEL");
                        },
                        error: function (err) { }
                    })
                    
                    var mVASTypeData = {}, mAttribCodeData = {};
                    var iCounter1 = 0, iCounter2 = 0;
                    var oTabData = this.byId(arg + "Tab").getModel().getData().rows;

                    oTabData.forEach(item => {
                        this._oModelStyle.read('/VASTypeSet', { 
                            urlParameters: {
                                "$filter": "PROCESSCD eq '" + item.PROCESSCD + "'"
                            },
                            success: function (oData, response) {
                                iCounter1++; 
                                mVASTypeData[item.PROCESSCD] = oData.results;

                                if (iCounter1 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mVASTypeData), "VASTYPE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter1++; 
                            }
                        })

                        this._oModelStyle.read('/AttribCodeSet', { 
                            urlParameters: {
                                "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq '" + item.ATTRIBTYP + "'"
                            },
                            success: function (oData, response) {
                                iCounter2++; 
                                mAttribCodeData[item.PROCESSCD] = oData.results;

                                if (iCounter2 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mAttribCodeData), "ATTRIBCODE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter2++; 
                            }
                        })
                    })
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var sColName = "";

                // this._validationErrors = [];

                oTable.getColumns().forEach((col, idx) => {    
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                            else if (ci.DataType === "BOOLEAN" ) {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + sColName + "}",
                                    wrapping: false,
                                    editable: false,
                                    tooltip: "{" + sColName + "}"
                                }));
                            }
                        })
                })
            },

            handleValueHelp: function(oEvent) {
                var me = this;
                var oSource = oEvent.getSource();
                var sModel = this._sTableModel;
                
                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;
                
                var vColProp = this._aColumns[sModel].filter(item => item.ColumnName === this._inputField);
                var vItemValue = vColProp[0].ValueHelp.items.value;
                var vItemDesc = vColProp[0].ValueHelp.items.text;
                var sPath = vColProp[0].ValueHelp.items.path;
                var vh = this.getView().getModel(sPath).getData();
                
                vh.forEach(item => {
                    item.VHTitle = item[vItemValue];
                    item.VHDesc = vItemValue === vItemDesc ? "" : item[vItemDesc];
                    item.VHSelected = (item[vItemValue] === this._inputValue);
                })

                vh.sort((a,b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: vColProp[0].label,
                    table: sModel
                });  
                
                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuiio2.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );
                    
                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }                            

                this._valueHelpDialog.open();
            },
    
            handleValueHelpClose : function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");
    
                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());
        
                        if (this._inputValue !== oSelectedItem.getTitle()) {                                
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;                            
                            this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                            this._bColorChanged = true;
                        }
                    }
    
                    this._inputSource.setValueState("None");
                }
            },
    
            handleValueHelpChange: function(oEvent) {   
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");
        
                oSource.getSuggestionItems().forEach(item => {
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })
    
                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }
    
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);

                if (this._sTableModel === "color") this._bColorChanged = true;
                if (this._sTableModel === "process") this._bProcessChanged = true;
            },

            handleSuggestion: function(oEvent) {
                var me = this;
                var oInput = oEvent.getSource();
                var sInputField = oInput.getBindingInfo("value").parts[0].path;
    
                if (sInputField === "CPOATRIB") {
                    console.log(oInput.getSuggestionItems())
                    if (oInput.getSuggestionItems().length === 0) { 
                        var oData = me.getView().getModel("CUSTCOLOR_MODEL").getData();
                        var sKey = "";
                        // console.log(oData);
                        if (sInputField === "CPOATRIB") { 
                            sKey = "CUSTCOLOR";
                        }
                        // else if (sInputField === "PAYTERMS") { 
                        //     sKey = "INCO1";
                        // }
                        // else if (sInputField === "DESTINATION") {
                        //     sKey = "INCO2";
                        // }
                        
                        oInput.bindAggregation("suggestionItems", {
                            path: "CUSTCOLOR_MODEL>/",
                            length: 10000,
                            template: new sap.ui.core.ListItem({
                                key: "{CUSTCOLOR_MODEL>" + sKey + "}",
                                text: "{CUSTCOLOR_MODEL>" + sKey + "}"
                            }),
                            templateShareable: false
                        });
                    }
                }
            },

            onCloseConfirmDialog: function(oEvent) {   
                if (this._ConfirmDialog.getModel().getData().Action === "update-cancel") {
                    if (this._sTableModel === "color") {
                        this.byId("btnEditColor").setVisible(true);
                        this.byId("btnSaveColor").setVisible(false);
                        this.byId("btnCancelColor").setVisible(false);
                    }
                    else if (this._sTableModel === "process") {
                        this.byId("btnEditProcess").setVisible(true);
                        this.byId("btnSaveProcess").setVisible(false);
                        this.byId("btnCancelProcess").setVisible(false);                    
                    }
    
                    this.setRowReadMode(this._sTableModel);
                    this.byId(this._sTableModel + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                    this.byId(this._sTableModel + "Tab").bindRows("/rows");
                    this._dataMode = "EDIT";

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                    var oIconTabBarStyle = this.byId("itbStyleDetail");
                    oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                }
    
                this._ConfirmDialog.close();
            },  
    
            onCancelConfirmDialog: function(oEvent) {   
                this._ConfirmDialog.close();
            },

            onManageStyle: function(oEvent) {
                var vStyle = "1000000272";
                // var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                // var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                //     target: {
                //         semanticObject: "ZUI_3DERP",
                //         action: "manage&/RouteStyleDetail/"
                //     },
                //     params: {
                //         "styleno": vStyle,
                //         "sbu": "VER"
                //     }
                // })) || ""; // generate the Hash to display style

                // oCrossAppNavigator.toExternal({
                //     target: {
                //         shellHash: hash
                //     }
                // }); // navigate to Supplier application

                sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then( function (oService) {
                    oService.hrefForExternalAsync({
                        target : {
                            semanticObject: "ZUI_3DERP",
                            action: "manage&/RouteStyleDetail/"
                        },
                        params: {
                            "styleno": vStyle,
                            "sbu": "VER"
                        }
                    }).then( function(sHref) {
                        console.log("test");
                        console.log(sHref);
                        // Place sHref somewhere in the DOM
                    });
                 });

            },

            onNewStyle: function(oEvent) {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("RouteStyles");
                // console.log()
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZUI_3DERP",
                        action: "manage&/RouteStyleDetail/"
                    },
                    params: {
                        "styleno": "NEW",
                        "sbu": "VER"
                    }
                })) || ""; // generate the Hash to display style

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application
            },

            onLeaveAppExtension: function (bIsDestroyed) {
                Log.info("onLeaveAppExtension called!");
                var fnReactivate = function () {
                    sap.m.MessageToast("onLeaveAppExtension is called here").show();
                };
                return fnReactivate;
            },

            //******************************************* */
            // MATERIAL LIST
            //******************************************* */            

            onExport: Utils.onExport,

            

        });
    });