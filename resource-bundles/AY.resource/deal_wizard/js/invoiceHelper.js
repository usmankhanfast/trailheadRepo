app.service('invoiceHelper', function(appConfig) {
    var PERCENT_PRECISION = 5;
    var REV_REC_TRUE = 'Yes';
    var REV_REC_FALSE = 'No';

    var init = function(scope, defaultInvoiceWrapper) {
        this.defaultInvoiceWrapper = defaultInvoiceWrapper;

        initFields([defaultInvoiceWrapper]);

        this.invoices = scope.invoices || [];

        initFields(this.invoices);

        watchDefaultInvoiceValues(scope);

        scope.$watch('totalCommission.value', function(newValue, oldValue) {
            if (newValue === oldValue) {
                return;
            }
            recalculateCommissionAmounts(scope);
        });
    };

    var htmlDecode = function(input) {
        return input.toString()
            .replace(/&lt;/g, '<')
            .replace(/&#60;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#62;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&#38;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#34;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#39;/g, "'")
        ;
    };

    var isValueTrue = function(v) {
        return v === true || v === 'true';
    };

    var initFields = function(invoices) {
        if (!invoices || invoices.length === 0) {
            return;
        }

        invoices.forEach(function(invoice) {
            invoice.estimatedInvoiceDate.isRequired = true;
            invoice.specificInvoiceDate.isRequired = true;
            invoice.paymentTerms.isRequired = true;
            invoice.invoiceTemplate.isRequired = true;
            invoice.recognizeRevenue.isRequired = true;
            invoice.commissionPercent.value = round(invoice.commissionPercent.value, PERCENT_PRECISION);

            if (invoice.notes.value) {
                invoice.notes.value = htmlDecode(invoice.notes.value);
            }

            if (invoice.isPrinted) {
                invoice.isPrinted.displayValue = (invoice.isPrinted.value === "true") ? "Yes" : "No";
            }

            if (!invoice.useDefaultValues) {
                invoice.useDefaultValues = {
                    label: 'Use Default',
                    value: false
                };
            }
        });
    };

    var createNewInvoice = function(scope, isProForma) {
        var previousInvoice,
            invoices = scope.invoices;

        for (var i = invoices.length - 1; i >= 0; i--) {
            if (!invoices[i].isFlaggedForDelete) {
                previousInvoice = invoices[i];
                break;
            }
        }

        var newInvoice = angular.copy(this.defaultInvoiceWrapper);
        newInvoice.commissionAmount.value = scope.unbilledGrossCommission || '0.00';
        newInvoice.canConvert = newInvoice.isProForma = isProForma;

        if (previousInvoice) {
            newInvoice.useCommissionPercent = previousInvoice.useCommissionPercent;
        }

        calculateCommissionPercent(newInvoice, scope, true);

        setEstimatedDateLabel(newInvoice);

        return newInvoice;
    };

    var setEstimatedDateLabel = function(invoice) {
        if (!invoice.estimatedInvoiceDate.defaultLabel) {
            invoice.estimatedInvoiceDate.defaultLabel = invoice.estimatedInvoiceDate.label;
        }

        invoice.estimatedInvoiceDate.label = (invoice.isProForma)
            ? appConfig.labels.proFormaInvoiceDate : invoice.estimatedInvoiceDate.defaultLabel;
    };

    var round = function(value, decimals) {
        value = parseFloat(value);
        var threshold = Number(1 + 'e-' + (decimals + 1));
        if (Math.abs(value) < threshold) {
            return 0;
        }
        return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
    };

    var setAsCurrency = function(value) {
        var num = Number(value);
        return isNaN(num) ? value : num.toFixed(2);
    };

    var recalculateCommissionAmounts = function(scope) {
        scope.invoices.forEach(function(invoice) {
            if (invoice.useCommissionPercent) {
                calculateCommissionAmount(invoice, scope);
            } else {
                calculateCommissionPercentWhenUsingCommissionAmount(invoice, scope);
            }
        });
    };

    var calculateCommissionPercent = function(invoice, scope, forceCalculation) {
        var grossCommission;

        if (invoice.useCommissionPercent && !forceCalculation) {
            return;
        }

        grossCommission = parseFloat(scope.totalCommission.value);

        invoice.commissionPercent.value = (isNaN(grossCommission) || grossCommission === 0)
            ? 0 : round((parseFloat(invoice.commissionAmount.value) / grossCommission * 100), 5);

        invoice.commissionPercentActual.value = (isNaN(grossCommission) || grossCommission === 0)
            ? 0 : (parseFloat(invoice.commissionAmount.value) / grossCommission * 100);
    };

    var enableTaxGroup = function(invoice) {
        return invoice.currencyIsoCode !== null && invoice.currencyIsoCode !== undefined && invoice.currencyIsoCode !== 'CAD';
    };

    var calculateCommissionAmount = function(invoice, scope, forceCalculation) {
        var grossCommission;

        if (!invoice.useCommissionPercent && !forceCalculation) {
            return;
        }

        grossCommission = parseFloat(scope.totalCommission.value);

        invoice.commissionAmount.value = (isNaN(grossCommission))
            ? 0 : setAsCurrency(round((parseFloat(invoice.commissionPercent.value) * grossCommission / 100), 2));

        invoice.commissionAmount.displayValue = setAsCurrency(invoice.commissionAmount.value);

        invoice.commissionPercentActual.value = invoice.commissionPercent.value;
    };

    var calculateCommissionPercentWhenUsingCommissionAmount = function(invoice, scope) {
        var grossCommission;

        if (invoice.useCommissionPercent) {
            return;
        }

        grossCommission = parseFloat(scope.totalCommission.value);

        invoice.commissionPercent.value = (isNaN(grossCommission) || grossCommission === 0)
            ? 0 : round(parseFloat(invoice.commissionAmount.value) / grossCommission * 100, PERCENT_PRECISION);

        invoice.commissionPercentActual.value = invoice.commissionPercent.value;
    };

    var copyInvoice = function(invoice) {
        var copiedInvoice = angular.copy(invoice);
        copiedInvoice.id = null;
        copiedInvoice.isVoided = false;
        copiedInvoice.ignoreUpdates = false;
        copiedInvoice.invoiceUrl.value = this.defaultInvoiceWrapper.invoiceUrl.value;
        copiedInvoice.isPrinted.value = this.defaultInvoiceWrapper.isPrinted.value;
        return copiedInvoice;
    };

    var convertInvoice = function(invoice, scope) {
        var tempDateObject;
        invoice.isProForma = !invoice.isProForma;

        setEstimatedDateLabel(invoice);

        if (!invoice.isProForma) {
            invoice.commissionAmount.value = setAsCurrency(invoice.proformaAmount.value);
            calculateCommissionPercent(invoice, scope, true);

            // if the proforma has already been printed, default rev rec to 'Yes' and set the specific invoice date
            if (!invoice.isProForma) {
                if (isValueTrue(invoice.isPrinted.value)) {
                    tempDateObject = angular.copy(invoice.estimatedInvoiceDate);
                    invoice.recognizeRevenue.value = REV_REC_TRUE;
                    invoice.estimatedInvoiceDate.value = null;
                    invoice.estimatedInvoiceDate.displayValue = '';
                    invoice.specificInvoiceDate.value = tempDateObject.value;
                    invoice.specificInvoiceDate.displayValue = tempDateObject.displayValue;
                } else {
                    invoice.recognizeRevenue.value = REV_REC_FALSE;
                }
            }

            moveInvoiceToTop(invoice, this.invoices);
        }
    };

    var deleteBulkInvoice = function(invoices) {
        angular.forEach(invoices, function(invoice) {
            invoice.isFlaggedForDelete = true;
            invoice.commissionPercent.value = 0;
            invoice.commissionPercentActual.value = 0;
            invoice.commissionAmount.value = 0;
        });
    };

    var deleteInvoice = function(invoice) {
        invoice.isFlaggedForDelete = true;
        invoice.commissionPercent.value = 0;
        invoice.commissionPercentActual.value = 0;
        invoice.commissionAmount.value = 0;
    };

    var voidBulkInvoice = function(invoices, unvoidInvMap) {
        angular.forEach(invoices, function(invoice) {
            var statusVoidUnvoid = unvoidInvMap.get(invoice.overTheTermCommissionItem.value);
            if (statusVoidUnvoid!==null) {
                if (invoice.isVoided===true) {
                    invoice.isVoided = statusVoidUnvoid;
                } else {
                    invoice.isVoided = statusVoidUnvoid;
                }
            }
            if (isValueTrue(invoice.isVoided) && (invoice.amountPaid.value === 0 || invoice.amountPaid.value === null)) {
                invoice.recognizeRevenue.value = REV_REC_FALSE; // set to No to allow voiding of invoice on unpaid invoices
            }
        });
    };

    var voidInvoice = function(invoice) {
        invoice.isVoided = !invoice.isVoided;
        if (isValueTrue(invoice.isVoided) && (invoice.amountPaid.value === 0 || invoice.amountPaid.value === null)) {
            invoice.recognizeRevenue.value = REV_REC_FALSE; // set to No to allow voiding of invoice on unpaid invoices
        }
    };

    var moveInvoiceToTop = function(invoice, invoices) {
        invoice = invoices.splice(invoices.indexOf(invoice), 1)[0];
        invoices.splice(0, 0, invoice);
    };

    var watchDefaultInvoiceValues = function(scope) {
        var updateInvoicesWithDefaultValues = function(newValue, oldValue) {
            if (newValue === oldValue) {
                return;
            }
            scope.invoices.forEach(function(invoice) {
                setDefaultInvoiceValues(invoice, scope);
            });
        };

        scope.isRunningInit = true;
        scope.$watch('billTo.value', updateInvoicesWithDefaultValues);
        scope.$watch('defaultAttention.value', updateInvoicesWithDefaultValues);
        scope.$watch('defaultInvoiceTemplate.value', updateInvoicesWithDefaultValues);
        scope.$watch('defaultPaymentTerms.value', updateInvoicesWithDefaultValues);
        scope.$watch('defaultNetsuiteBillTo.value', updateInvoicesWithDefaultValues);
        scope.$watch('billToAddress.value', updateInvoicesWithDefaultValues);
        scope.$watch('defaultTaxGroup.value', updateInvoicesWithDefaultValues);
        setTimeout(function() {
            scope.isRunningInit = false;
        }, 500);
    };

    var setDefaultInvoiceValues = function(invoice, scope) {
        var setFieldFromField = function(targetField, fromField) {
            targetField.displayValue = fromField.displayValue;
            targetField.value = fromField.value;
            if (targetField.options) {
                var selectedOption = fromField.options.filter(function(option) {
                    return fromField.value === option.value;
                });

                if (selectedOption[0]) {
                    targetField.displayValue = selectedOption[0].displayValue;
                } else {
                    targetField.displayValue = null;
                }
            }
        };

        if (!invoice.isVoided && invoice.useDefaultValues && invoice.useDefaultValues.value && !scope.isRunningInit) {
            setFieldFromField(invoice.aptoBillTo, scope.billTo);
            setFieldFromField(invoice.nsBillTo, scope.defaultNetsuiteBillTo);
            setFieldFromField(invoice.billToAddress, scope.billToAddress);
            setFieldFromField(invoice.attention, scope.defaultAttention);
            setFieldFromField(invoice.invoiceTemplate, scope.defaultInvoiceTemplate);
            setFieldFromField(invoice.paymentTerms, scope.defaultPaymentTerms);
            setFieldFromField(invoice.taxGroup, scope.defaultTaxGroup);
        }
    };

    var setProformaCommissionPercentsAndAmounts = function(invoices, scope) {
        if (!invoices || invoices.length === 0) {
            return;
        }

        invoices.forEach(function(invoice) {
            if (!invoice.isProForma) {
                return;
            }

            invoice.commissionAmount.value = setAsCurrency(invoice.proformaAmount.value);
            calculateCommissionPercent(invoice, scope, true);
        });
    };

    var clearNsBillTos = function(scope) {
        scope.invoices.forEach(function(invoice) {
            if (!invoice.nsBillTo.value || invoice.isVoided) {
                return;
            }

            invoice.nsBillTo.value = '';
            invoice.nsBillTo.displayValue = '';
            invoice.nsBillTo.formattedAddress = '';
            invoice.nsBillTo.name = '';
            invoice.billToAddress.value = '';
            invoice.billToAddress.displayValue = '';
        });

        if (scope.defaultNetsuiteBillTo.value) {
            scope.defaultNetsuiteBillTo.value = '';
            scope.defaultNetsuiteBillTo.displayValue = '';
            scope.defaultNetsuiteBillTo.formattedAddress = '';
            scope.billToAddress.value = '';
            scope.billToAddress.displayValue = '';
        }
    };

    return {
        init: init,
        initFields: initFields,
        createNewInvoice: createNewInvoice,
        copyInvoice: copyInvoice,
        convertInvoice: convertInvoice,
        deleteInvoice: deleteInvoice,
        voidInvoice: voidInvoice,
        setDefaultInvoiceValues: setDefaultInvoiceValues,
        setProformaCommissionPercentsAndAmounts: setProformaCommissionPercentsAndAmounts,
        clearNsBillTos: clearNsBillTos,
        calculateCommissionPercent: calculateCommissionPercent,
        calculateCommissionAmount: calculateCommissionAmount,
        enableTaxGroup: enableTaxGroup,
        deleteBulkInvoice: deleteBulkInvoice,
        voidBulkInvoice: voidBulkInvoice
    }
});
