sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    'sap/m/MessageStrip',
    "../control/DynamicTable"
],
    /** 
     * @param {typeof sap.ui.core.mvc.Controller} Controller 
     */
    function (Controller, Filter, Common, Utils, JSONModel, jQuery, HashChanger, MessageStrip, control) {
        "use strict";

        var that;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });

        var Core = sap.ui.getCore();

        return Controller.extend("zuiio2.controller.iodetail", {
            onInit: function () {
                that = this;

                //get current userid
                var oModel = new sap.ui.model.json.JSONModel();
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

                //Add the attachments to screen
                this.appendUploadCollection();

                //Set the file data model
                var oModel = this.getOwnerComponent().getModel("FileModel");
                this.getView().setModel(oModel, "FileModel");

                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

            },

            _routePatternMatched: function (oEvent) {
                this._ioNo = oEvent.getParameter("arguments").iono; //get Style from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern

                //set all as no changes at first load
                this._headerChanged = false;

                //set Change Status    
                this.setChangeStatus(false);

                if (this._ioNo === "NEW") {
                    //create new - only header is editable at first
                    this.setHeaderEditMode();
                    // this.setDetailVisible(false);
                } else {
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
                }, 100);

                //build Dynamic table for Status
                setTimeout(() => {
                    this.getStatDynamicTableColumns();
                }, 100);

                 //Attachments
                 this.bindUploadCollection();
                 this.getView().getModel("FileModel").refresh();
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
                        }, 100);
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
                        }, 100);
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
                        template: me.columnTemplate(sColumnId, sColumnType, "Stat"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
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
                        }, 100);
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
                        }, 100);

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
                        template: me.columnTemplate(sColumnId, sColumnType, "Attrib"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
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
                    if (sSource === "Attrib") {
                        tToolTip = "Manage this Attribute"
                        sKey = "VERNO"
                    } else if (sSource === "Stat") {
                        tToolTip = "Manage this Status"
                        sKey = "STATUSCD"
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

            setChangeStatus: function (changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) { }
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
            // Attachments
            //******************************************* */

            appendUploadCollection: function () {
                //set properties and adding the attachments component to the screen
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.attachChange(that.onFileSelected);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
                oUploadCollection.attachBeforeUploadStarts(that.onBeforeUploadStarts);
                oUploadCollection.setMultiple(true);
                //set the odata path of the upload collection
                oUploadCollection.setUploadUrl("/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet");
                //attach function when an upload is completed
                oUploadCollection.attachUploadComplete(that.onUploadComplete);
            },

            bindUploadCollection: function () {
                var oUploadCollection = this.getView().byId('UploadCollection');
                //setting the properties of the upload collection and binding
                oUploadCollection.bindItems({
                    path: 'FileModel>/FileIOSet',
                    filters: [
                        new sap.ui.model.Filter("Iono", sap.ui.model.FilterOperator.EQ, that._ioNo)
                    ],
                    template: new sap.m.UploadCollectionItem({
                        documentId: "{FileModel>Iono}",
                        fileName: "{FileModel>Filename}",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(guid'{FileModel>Iono}')/$value",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='888',Sbu='VER',Iono='1000115',Seqno='3')/$value",
                        url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='{FileModel>Mandt}',Sbu='{FileModel>Sbu}',Iono='{FileModel>Iono}',Seqno='{FileModel>Seqno}')/$value",
                        mimeType: "{FileModel>MIMEType}",
                        enableEdit: false,
                        enableDelete: false,
                        visibleDelete: false,
                        visibleEdit: false,
                        attributes: [
                            new sap.m.ObjectAttribute({ text: "{path: 'FileModel>Createddt', type: 'sap.ui.model.type.Date', formatOptions: { pattern: 'yyyy/MM/dd' }}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc1}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc2}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Remarks}" })
                        ]
                    })
                });
            },

            setFilesEditMode: function () {
                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(false);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
            },

            cancelFilesEdit: function () {
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");
                //make upload button visible
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(true);
                oUploadCollection.setMode(sap.m.ListMode.None);
            },

            onAddFile: function () {
                //open the file select dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.openFileDialog();
            },

            onFileSelected: function () {
                //triggered when file selected
                that.uploadFile();
            },

            uploadFile: function () {
                //open the new file dialog
                if (!this._UploadFileDialog) {
                    this._UploadFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.UploadFile", this);
                    this.getView().addDependent(this._UploadFileDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._UploadFileDialog.addStyleClass("sapUiSizeCompact");
                this._UploadFileDialog.open();
            },

            onStartUploadFile: function () {
                //on confirm of upload dialog, start upload of file
                this._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var cFiles = oUploadCollection.getItems().length;
                if (cFiles > 0) {
                    oUploadCollection.upload();
                }
            },

            onBeforeUploadStarts: function (oEvent) {
                //setting the HTTP headers for additional information

                //SBU
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "sbu",
                    value: that._sbu
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //io no
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "iono",
                    value: that._ioNo
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //file description 1
                var fileDesc1 = sap.ui.getCore().byId("FileDesc1");
                var oFileDesc1Param = new sap.m.UploadCollectionParameter({
                    name: "desc1",
                    value: fileDesc1.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc1Param);
                fileDesc1.setValue('');

                //file description 2
                var fileDesc2 = sap.ui.getCore().byId("FileDesc2");
                var oFileDesc2Param = new sap.m.UploadCollectionParameter({
                    name: "desc2",
                    value: fileDesc2.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc2Param);
                fileDesc2.setValue('');

                //remarks
                var fileRemarks = sap.ui.getCore().byId("FileRemarks");
                var oFileRemarksParam = new sap.m.UploadCollectionParameter({
                    name: "remarks",
                    value: fileRemarks.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileRemarksParam);
                fileRemarks.setValue('');

                //filename selected
                var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
                    name: "slug",
                    value: oEvent.getParameter("fileName")
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

                var oModel = that.getView().getModel("FileModel");
                oModel.refreshSecurityToken();

                //add the HTTP headers
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders['x-csrf-token'];

                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
            },

            onUploadComplete: function () {
                //on upload complete refresh the list
                that.getView().getModel("FileModel").refresh();
                var oUploadCollection = that.getView().byId('UploadCollection');
                oUploadCollection.removeAllItems();
            },

            onDeleteFile: function () {
                //confirm delete selected file dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                var selected = oUploadCollection.getSelectedItems();

                if (selected.length > 0) {
                    if (!this._ConfirmDeleteFileDialog) {
                        this._ConfirmDeleteFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDeleteFile", this);
                        this.getView().addDependent(this._ConfirmDeleteFileDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._ConfirmDeleteFileDialog.addStyleClass("sapUiSizeCompact");
                    this._ConfirmDeleteFileDialog.open();
                } else {
                    Common.showMessage(this._i18n.getText('t10'));
                }
            },

            onConfirmDeleteFile: function () {
                //delete selected file, call delete method of file odata service
                that._ConfirmDeleteFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var sPath = oUploadCollection.getSelectedItems()[0].getBindingContext('FileModel').sPath;
                var oModel = that.getView().getModel("FileModel");
                oModel.remove(sPath, {
                    success: function (oData, oResponse) {
                        that.getView().getModel("FileModel").refresh();
                    },
                    error: function (err) {
                    }
                });
            },

            onCancelUploadFile: function () {
                //close edit mode, refresh the file list
                that._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                that.getView().getModel("FileModel").refresh();
                oUploadCollection.removeAllItems();
            },
        });
    });