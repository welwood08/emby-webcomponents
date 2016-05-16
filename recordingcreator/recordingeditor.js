﻿define(['dialogHelper', 'globalize', 'layoutManager', 'mediaInfo', 'apphost', 'connectionManager', 'require', 'loading', 'scrollHelper', 'scrollStyles', 'paper-checkbox', 'emby-collapsible', 'paper-input', 'paper-icon-button-light', 'css!./../formdialog', 'css!./recordingcreator', 'html!./../icons/mediainfo.html', 'html!./../icons/nav.html'], function (dialogHelper, globalize, layoutManager, mediaInfo, appHost, connectionManager, require, loading, scrollHelper) {

    var currentDialog;
    var recordingUpdated = false;
    var currentItemId;

    function renderTimer(context, item) {

        var programInfo = item.ProgramInfo || {};

        context.querySelector('.itemName').innerHTML = item.Name;
        context.querySelector('.itemEpisodeName').innerHTML = item.EpisodeTitle || '';

        context.querySelector('.itemGenres').innerHTML = (programInfo.Genres || []).join(' / ');
        context.querySelector('.itemOverview').innerHTML = programInfo.Overview || '';

        var timerPageImageContainer = context.querySelector('.timerPageImageContainer');

        if (programInfo.ImageTags && programInfo.ImageTags.Primary) {

            var imgUrl = ApiClient.getScaledImageUrl(programInfo.Id, {
                maxWidth: 200,
                maxHeight: 200,
                tag: programInfo.ImageTags.Primary,
                type: "Primary"
            });

            timerPageImageContainer.classList.remove('hide');
            timerPageImageContainer.innerHTML = '<img src="' + imgUrl + '" style="max-width:200px;max-height:200px;" />';

        } else {
            timerPageImageContainer.classList.add('hide');
        }

        context.querySelector('.itemMiscInfoPrimary').innerHTML = mediaInfo.getPrimaryMediaInfoHtml(programInfo);
        context.querySelector('.itemMiscInfoSecondary').innerHTML = mediaInfo.getSecondaryMediaInfoHtml(programInfo);

        context.querySelector('#txtPrePaddingMinutes').value = item.PrePaddingSeconds / 60;
        context.querySelector('#txtPostPaddingMinutes').value = item.PostPaddingSeconds / 60;

        var timerStausElem = context.querySelector('.timerStatus');

        if (item.Status == 'New') {
            timerStausElem.classList.add('hide');
        } else {
            timerStausElem.classList.remove('hide');
            timerStausElem.innerHTML = 'Status:&nbsp;&nbsp;&nbsp;' + item.Status;
        }

        loading.hide();
    }

    function closeDialog(isSubmitted) {

        recordingUpdated = isSubmitted;
        dialogHelper.close(currentDialog);
    }

    function onSubmit(e) {

        loading.show();

        var form = this;

        ApiClient.getLiveTvTimer(currentItemId).then(function (item) {

            item.PrePaddingSeconds = form.querySelector('#txtPrePaddingMinutes').value * 60;
            item.PostPaddingSeconds = form.querySelector('#txtPostPaddingMinutes').value * 60;
            ApiClient.updateLiveTvTimer(item).then(function () {
                loading.hide();
                require(['toast'], function (toast) {
                    toast(Globalize.translate('MessageRecordingSaved'));
                    closeDialog(true);
                });
            });
        });

        e.preventDefault();

        // Disable default form submission
        return false;
    }

    function init(context) {

        context.querySelector('.btnCancel').addEventListener('click', function () {

            closeDialog(false);
        });

        context.querySelector('form').addEventListener('submit', onSubmit);

        context.querySelector('.btnHeaderSave').addEventListener('click', function (e) {

            context.querySelector('.btnSave').click();
        });
    }

    function reload(context, id) {

        loading.show();
        currentItemId = id;

        ApiClient.getLiveTvTimer(id).then(function (result) {

            renderTimer(context, result);
            loading.hide();
        });
    }

    function showEditor(itemId) {

        return new Promise(function (resolve, reject) {

            recordingUpdated = false;
            loading.show();

            require(['text!./recordingeditor.template.html'], function (template) {

                var dialogOptions = {
                    removeOnClose: true,
                    scrollY: false
                };

                if (layoutManager.tv) {
                    dialogOptions.size = 'fullscreen';
                } else {
                    dialogOptions.size = 'small';
                }

                var dlg = dialogHelper.createDialog(dialogOptions);

                dlg.classList.add('formDialog');
                dlg.classList.add('recordingDialog');

                var html = '';

                html += globalize.translateDocument(template, 'sharedcomponents');

                dlg.innerHTML = html;
                document.body.appendChild(dlg);

                currentDialog = dlg;

                dlg.addEventListener('close', function () {

                    if (recordingUpdated) {
                        resolve();
                    } else {
                        reject();
                    }
                });

                if (layoutManager.tv) {
                    scrollHelper.centerFocus.on(dlg.querySelector('.dialogContent'), false);
                }

                init(dlg);

                reload(dlg, itemId);

                dialogHelper.open(dlg);
            });
        });
    }

    return {
        show: showEditor
    };
});