( function( $, wp, settings ) {
	var $document = $( document );

	wp = wp || {};

	/**
	 * The WP Updates object.
	 *
	 * @type {object}
	 */
	wp.updates = wp.updates || {};

	/**
	 * Localized strings.
	 *
	 * @type {object}
	 */
	wp.updates.l10n = _.extend( wp.updates.l10n, settings.l10n || {} );

	/**
	 * Adds or updates an admin notice.
	 *
	 * @since 4.6.0
	 * @see https://core.trac.wordpress.org/ticket/41221
	 *
	 * @param {object}  data
	 * @param {*=}      data.selector      Optional. Selector of an element to be replaced with the admin notice.
	 * @param {string=} data.id            Optional. Unique id that will be used as the notice's id attribute.
	 * @param {string=} data.className     Optional. Class names that will be used in the admin notice.
	 * @param {string=} data.message       Optional. The message displayed in the notice.
	 * @param {number=} data.successes     Optional. The amount of successful operations.
	 * @param {number=} data.errors        Optional. The amount of failed operations.
	 * @param {Array=}  data.errorMessages Optional. Error messages of failed operations.
	 *
	 */
	wp.updates.addAdminNotice = function( data ) {
		var $notice    = $( data.selector ),
			$headerEnd = $( '.wp-header-end' ),
			$adminNotice;

		delete data.selector;
		$adminNotice = wp.updates.adminNotice( data );

		// Check if this admin notice already exists.
		if ( ! $notice.length ) {
			$notice = $( '#' + data.id );
		}

		if ( $notice.length ) {
			$notice.replaceWith( $adminNotice );
		} else if ( $headerEnd.length ) {
			$( '.wp-header-end' ).after( $adminNotice );
		} else {
			$( '.wrap' ).find( '> h1' ).after( $adminNotice );
		}

		$document.trigger( 'wp-updates-notice-added' );
	};

	/**
	 * Sends an Ajax request to the server to import a demo.
	 *
	 * @param {object}             args
	 * @param {string}             args.slug    Demo ID.
	 * @param {importDemoSuccess=} args.success Optional. Success callback. Default: wp.updates.importDemoSuccess
	 * @param {importDemoError=}   args.error   Optional. Error callback. Default: wp.updates.importDemoError
	 * @return {$.promise} A jQuery promise that represents the request,
	 *                     decorated with an abort() method.
	 */
	wp.updates.importDemo = function( args ) {
		var $message = $( '.demo-import[data-slug="' + args.slug + '"]' );

		args = _.extend( {
			success: wp.updates.importDemoSuccess,
			error: wp.updates.importDemoError
		}, args );

		$message.addClass( 'updating-message' );
		$message.parents( '.theme' ).addClass( 'focus' );
		if ( $message.html() !== wp.updates.l10n.importing ) {
			$message.data( 'originaltext', $message.html() );
		}

		$message
			.text( wp.updates.l10n.importing )
			.attr( 'aria-label', wp.updates.l10n.demoImportingLabel.replace( '%s', $message.data( 'name' ) ) );
		wp.a11y.speak( wp.updates.l10n.importingMsg, 'polite' );

		// Remove previous error messages, if any.
		$( '.theme-info .theme-description, [data-slug="' + args.slug + '"]' ).removeClass( 'demo-import-failed' ).find( '.notice.notice-error' ).remove();

		$document.trigger( 'wp-demo-importing', args );

		return wp.updates.ajax( 'import-demo', args );
	};

	/**
	 * Updates the UI appropriately after a successful demo import.
	 *
	 * @typedef {object} importDemoSuccess
	 * @param {object} response            Response from the server.
	 * @param {string} response.slug       Slug of the demo that was imported.
	 * @param {string} response.previewUrl URL to preview the just imported demo.
	 */
	wp.updates.importDemoSuccess = function( response ) {
		var $card = $( '.theme-overlay, [data-slug=' + response.slug + ']' ),
			$message;

		$document.trigger( 'wp-demo-import-success', response );

		$message = $card.find( '.button-primary' )
			.removeClass( 'updating-message' )
			.addClass( 'updated-message disabled' )
			.attr( 'aria-label', wp.updates.l10n.demoImportedLabel.replace( '%s', response.demoName ) )
			.text( wp.updates.l10n.imported );

		wp.a11y.speak( wp.updates.l10n.importedMsg, 'polite' );

		setTimeout( function() {

			if ( response.previewUrl ) {

				// Remove the 'Preview' button.
				$message.siblings( '.demo-preview' ).remove();

				// Transform the 'Import' button into an 'Live Preview' button.
				$message
					.attr( 'target', '_blank' )
					.attr( 'href', response.previewUrl )
					.removeClass( 'demo-import updated-message disabled' )
					.addClass( 'live-preview' )
					.attr( 'aria-label', wp.updates.l10n.livePreviewLabel.replace( '%s', response.demoName ) )
					.text( wp.updates.l10n.livePreview );
			}
		}, 1000 );
	};

	/**
	 * Updates the UI appropriately after a failed demo import.
	 *
	 * @typedef {object} importDemoError
	 * @param {object} response              Response from the server.
	 * @param {string} response.slug         Slug of the demo to be imported.
	 * @param {string} response.errorCode    Error code for the error that occurred.
	 * @param {string} response.errorMessage The error that occurred.
	 */
	wp.updates.importDemoError = function( response ) {
		var $card, $button,
			errorMessage = wp.updates.l10n.importFailed.replace( '%s', response.errorMessage ),
			$message     = wp.updates.adminNotice( {
				className: 'update-message notice-error notice-alt',
				message:   errorMessage
			} );

		if ( ! wp.updates.isValidResponse( response, 'import' ) ) {
			return;
		}

		if ( $document.find( 'body' ).hasClass( 'modal-open' ) || $document.find( '.themes' ).hasClass( 'single-theme' ) ) {
			$button = $( '.demo-import[data-slug="' + response.slug + '"]' );
			$card   = $( '.theme-info .theme-description' ).prepend( $message );
		} else {
			$card   = $( '[data-slug="' + response.slug + '"]' ).removeClass( 'focus' ).addClass( 'demo-import-failed' ).append( $message );
			$button = $card.find( '.demo-import' );
		}

		$button
			.removeClass( 'updating-message' )
			.attr( 'aria-label', wp.updates.l10n.demoImportFailedLabel.replace( '%s', $button.data( 'name' ) ) )
			.text( wp.updates.l10n.importFailedShort );

		wp.a11y.speak( errorMessage, 'assertive' );

		$document.trigger( 'wp-demo-import-error', response );
	};

	/**
	 * Sends an Ajax request to the server to delete a demo.
	 *
	 * @param {object}             args
	 * @param {string}             args.slug    Demo ID.
	 * @param {deleteDemoSuccess=} args.success Optional. Success callback. Default: wp.updates.deleteDemoSuccess
	 * @param {deleteDemoError=}   args.error   Optional. Error callback. Default: wp.updates.deleteDemoError
	 * @return {$.promise} A jQuery promise that represents the request,
	 *                     decorated with an abort() method.
	 */
	wp.updates.deleteDemo = function( args ) {
		var $button = $( '.theme-actions .delete-demo' );

		args = _.extend( {
			success: wp.updates.deleteDemoSuccess,
			error: wp.updates.deleteDemoError
		}, args );

		if ( $button && $button.html() !== wp.updates.l10n.deleting ) {
			$button
				.data( 'originaltext', $button.html() )
				.text( wp.updates.l10n.deleting );
		}

		wp.a11y.speak( wp.updates.l10n.deleting, 'polite' );

		// Remove previous error messages, if any.
		$( '.theme-info .update-message' ).remove();

		$document.trigger( 'wp-demo-deleting', args );

		return wp.updates.ajax( 'delete-demo', args );
	};

	/**
	 * Updates the UI appropriately after a successful demo deletion.
	 *
	 * @typedef {object} deleteDemoSuccess
	 * @param {object} response      Response from the server.
	 * @param {string} response.slug Slug of the demo that was deleted.
	 */
	wp.updates.deleteDemoSuccess = function( response ) {
		wp.a11y.speak( wp.updates.l10n.deleted, 'polite' );

		$document.trigger( 'wp-demo-delete-success', response );
	};

	/**
	 * Updates the UI appropriately after a failed demo deletion.
	 *
	 * @typedef {object} deleteDemoError
	 * @param {object} response              Response from the server.
	 * @param {string} response.slug         Slug of the demo to be deleted.
	 * @param {string} response.errorCode    Error code for the error that occurred.
	 * @param {string} response.errorMessage The error that occurred.
	 */
	wp.updates.deleteDemoError = function( response ) {
		var $button      = $( '.theme-actions .delete-demo' ),
			errorMessage = wp.updates.l10n.deleteFailed.replace( '%s', response.errorMessage ),
			$message     = wp.updates.adminNotice( {
				className: 'update-message notice-error notice-alt',
				message:   errorMessage
			} );

		if ( wp.updates.maybeHandleCredentialError( response, 'delete-demo' ) ) {
			return;
		}

		$( '.theme-info .theme-description' ).before( $message );

		$button.html( $button.data( 'originaltext' ) );

		wp.a11y.speak( errorMessage, 'assertive' );

		$document.trigger( 'wp-demo-delete-error', response );
	};

	/**
	 * Sends an Ajax request to the server to install the plugins.
	 *
	 * @param {object}                    args         Arguments.
	 * @param {string}                    args.plugin  Plugin basename.
	 * @param {string}                    args.slug    Plugin identifier in the WordPress.org Plugin repository.
	 * @param {installPluginSuccess=} args.success Optional. Success callback. Default: wp.updates.installPluginSuccess
	 * @param {installPluginError=}   args.error   Optional. Error callback. Default: wp.updates.installPluginError
	 * @return {$.promise} A jQuery promise that represents the request,
	 *                     decorated with an abort() method.
	 */
	wp.updates.bulkInstallPlugin = function( args ) {
		var $installRow = $( 'tr[data-plugin="' + args.plugin + '"]' ),
			$message    = $installRow.find( '.update-message' ).removeClass( 'notice-error' ).addClass( 'updating-message notice-warning' ).find( 'p' );

		args = _.extend( {
			success: wp.updates.installPluginSuccess,
			error: wp.updates.installPluginError
		}, args );

		if ( $message.html() !== wp.updates.l10n.installing ) {
			$message.data( 'originaltext', $message.html() );
		}

		$message
			.addClass( 'updating-message' )
			.attr( 'aria-label', wp.updates.l10n.pluginInstallingLabel.replace( '%s', $message.data( 'name' ) ) )
			.text( wp.updates.l10n.installing );

		wp.a11y.speak( wp.updates.l10n.installingMsg, 'polite' );

		$document.trigger( 'wp-plugin-installing', args );

		return wp.updates.ajax( 'install-plugin', args );
	};

	/**
	 * Validates an AJAX response to ensure it's a proper object.
	 *
	 * If the response deems to be invalid, an admin notice is being displayed.
	 *
	 * @param {(object|string)} response              Response from the server.
	 * @param {function=}       response.always       Optional. Callback for when the Deferred is resolved or rejected.
	 * @param {string=}         response.statusText   Optional. Status message corresponding to the status code.
	 * @param {string=}         response.responseText Optional. Request response as text.
	 * @param {string}          action                Type of action the response is referring to. Can be 'delete',
	 *                                                'update' or 'install'.
	 */
	wp.updates.isValidResponse = function( response, action ) {
		var error = wp.updates.l10n.unknownError,
			errorMessage;

		// Make sure the response is a valid data object and not a Promise object.
		if ( _.isObject( response ) && ! _.isFunction( response.always ) ) {
			return true;
		}

		if ( _.isString( response ) && '-1' === response ) {
			error = wp.updates.l10n.nonceError;
		} else if ( _.isString( response ) ) {
			error = response;
		} else if ( 'undefined' !== typeof response.readyState && 0 === response.readyState ) {
			error = wp.updates.l10n.connectionError;
		} else if ( _.isString( response.statusText ) ) {
			error = response.statusText + ' ' + wp.updates.l10n.statusTextLink;
		}

		switch ( action ) {
			case 'import':
				errorMessage = wp.updates.l10n.importFailed;
				break;
		}

		errorMessage = errorMessage.replace( '%s', error );

		// Add admin notice.
		wp.updates.addAdminNotice( {
			id:        'unknown_error',
			className: 'notice-error is-dismissible',
			message:   _.unescape( errorMessage )
		} );

		// Change buttons of all running updates.
		$( '.button.updating-message' )
			.removeClass( 'updating-message' )
			.removeAttr( 'aria-label' )
			.text( wp.updates.l10n.updateFailedShort );

		wp.a11y.speak( errorMessage, 'assertive' );

		return false;
	};

	/**
	 * Pulls available jobs from the queue and runs them.
	 * @see https://core.trac.wordpress.org/ticket/39364
	 */
	wp.updates.queueChecker = function() {
		var job;

		if ( wp.updates.ajaxLocked || ! wp.updates.queue.length ) {
			return;
		}

		job = wp.updates.queue.shift();

		// Handle a queue job.
		switch ( job.action ) {
			case 'import-demo':
				wp.updates.importDemo( job.data );
				break;

			case 'delete-demo':
				wp.updates.deleteDemo( job.data );
				break;

			case 'install-plugin':
				wp.updates.bulkInstallPlugin( job.data );
				break;

			default:
				break;
		}

		// Handle a queue job.
		$document.trigger( 'wp-updates-queue-job', job );
	};

	$( function() {

		/**
		 * Bulk action handler for plugins installation.
		 *
		 * @param {Event} event Event interface.
		 */
		$document.on( 'click', 'a.plugins-install', function( event ) {
			var itemsSelected = $document.find( 'input[name="checked[]"]:checked' ),
				success       = 0,
				error         = 0,
				errorMessages = [],
				$message;


			// Remove previous error messages, if any.
			$( '.theme-info .update-message' ).remove();

			// Bail if there were no items selected.
			if ( ! itemsSelected.length ) {
				event.preventDefault();
				$( '.theme-about' ).animate( { scrollTop: 0 } );

				$message = wp.updates.adminNotice( {
					id:        'no-items-selected',
					className: 'update-message notice-error notice-alt',
					message:   wp.updates.l10n.noItemsSelected
				} );

				$( '.theme-info .plugins-info' ).after( $message );
			}

			// if ( ! window.confirm( 'Are you sure?' ) ) {
			// 	event.preventDefault();
			// 	return;
			// }

			wp.updates.maybeRequestFilesystemCredentials( event );

			event.preventDefault();

			// Un-check the bulk checkboxes.
			$document.find( '.manage-column [type="checkbox"]' ).prop( 'checked', false );

			$document.trigger( 'wp-plugin-bulk-install', itemsSelected );

			// Find all the checkboxes which have been checked.
			itemsSelected.each( function( index, element ) {
				var $checkbox = $( element ),
					$itemRow = $checkbox.parents( 'tr' );

				// Only add install-able items to the update queue.
				if ( ! $itemRow.hasClass( 'install' ) || $itemRow.find( 'notice-error' ).length ) {

					// Un-check the box.
					$checkbox.prop( 'checked', false );
					return;
				}

				// Add it to the queue.
				wp.updates.queue.push( {
					action: 'install-plugin',
					data:   {
						plugin: $itemRow.data( 'plugin' ),
						slug:   $itemRow.data( 'slug' )
					}
				} );
			} );

			// Display bulk notification for install of plugin.
			$document.on( 'wp-plugin-install-success wp-plugin-install-error', function( event, response ) {
				var $itemRow = $( '[data-slug="' + response.slug + '"]' ),
					$bulkActionNotice, itemName;

				if ( 'wp-' + response.install + '-install-success' === event.type ) {
					success++;
				} else {
					itemName = response.pluginName ? response.pluginName : $itemRow.find( '.plugin-name' ).text();

					error++;
					errorMessages.push( itemName + ': ' + response.errorMessage );
				}

				$itemRow.find( 'input[name="checked[]"]:checked' ).prop( 'checked', false );

				wp.updates.adminNotice = wp.template( 'wp-bulk-installs-admin-notice' );

				// Remove previous error messages, if any.
				$( '.theme-info .bulk-action-notice' ).remove();

				$message = wp.updates.adminNotice( {
					id:            'bulk-action-notice',
					className:     'bulk-action-notice notice-alt',
					successes:     success,
					errors:        error,
					errorMessages: errorMessages,
					type:          response.install
				} );

				$( '.theme-info .plugins-info' ).after( $message );

				$bulkActionNotice = $( '#bulk-action-notice' ).on( 'click', 'button', function() {
					// $( this ) is the clicked button, no need to get it again.
					$( this )
						.toggleClass( 'bulk-action-errors-collapsed' )
						.attr( 'aria-expanded', ! $( this ).hasClass( 'bulk-action-errors-collapsed' ) );
					// Show the errors list.
					$bulkActionNotice.find( '.bulk-action-errors' ).toggleClass( 'hidden' );
				} );

				if ( error > 0 && ! wp.updates.queue.length ) {
					$( '.theme-about' ).animate( { scrollTop: 0 } );
				}
			} );

			// Reset admin notice template after #bulk-action-notice was added.
			$document.on( 'wp-updates-notice-added', function() {
				wp.updates.adminNotice = wp.template( 'wp-updates-admin-notice' );
			} );

			// Check the queue, now that the event handlers have been added.
			wp.updates.queueChecker();
		} );
	} );

})( jQuery, window.wp, window._demoUpdatesSettings );
