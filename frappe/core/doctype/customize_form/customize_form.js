// Copyright (c) 2013, Web Notes Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.customize_form");

frappe.ui.form.on("Customize Form", "onload", function(frm) {
	frappe.customize_form.add_fields_help(frm);

	frm.set_query("doc_type", function() {
		return {
			filters: [
				['DocType', 'issingle', '=', 0],
				['DocType', 'in_create', '=', 0],
				['DocType', 'name', 'not in', 'DocType, DocField, DocPerm, User, Role, UserRole, \
					 Page, Page Role, Module Def, Print Format, Report, Customize Form, \
					 Customize Form Field']
			]
		};
	});

	$(frm.wrapper).on("grid-row-render", function(e, grid_row) {
		if(grid_row.doc && grid_row.doc.fieldtype=="Section Break") {
			$(grid_row.row).css({"font-weight": "bold"});
		}
	});
});

frappe.ui.form.on("Customize Form", "doc_type", function(frm) {
	if(frm.doc.doc_type) {
		return frm.call({
			method: "fetch_to_customize",
			doc: frm.doc,
			callback: function(r) {
				frm.refresh();
			}
		});
	}
});

frappe.ui.form.on("Customize Form", "refresh", function(frm) {
	frm.disable_save();
	frm.frm_head.appframe.iconbar.clear("1");

	if(frm.doc.doc_type) {
		frm.appframe.set_title_right("Update", function() {
			if(frm.doc.doc_type) {
				return frm.call({
					doc: frm.doc,
					method: "save_customization",
					callback: function(r) {
						if(!r.exc) {
							frappe.customize_form.clear_locals_and_refresh(frm);
						}
					}
				});
			}
		});

		frm.add_custom_button('Refresh Form', function() {
			frm.script_manager.trigger("doc_type");
		}, "icon-refresh", "btn-default");

		frm.add_custom_button('Reset to defaults', function() {
			frappe.customize_form.confirm(__('Remove all customizations?'), frm);
		}, "icon-eraser", "btn-default");
	}

	// if(!frm.doc.doc_type) {
	// 	var frm_head = frm.frm_head.appframe;
	// 	$(frm_head.buttons['Update']).prop('disabled', true);
	// 	$(frm_head.buttons['Refresh Form']).prop('disabled', true);
	// 	$(frm_head.buttons['Reset to defaults']).prop('disabled', true);
	// }

	if(frappe.route_options) {
		setTimeout(function() {
			frm.set_value("doc_type", frappe.route_options.doctype);
			frappe.route_options = null;
		}, 1000);
	}
});

frappe.customize_form.confirm = function(msg, frm) {
	if(!frm.doc.doc_type) return;

	var d = new frappe.ui.Dialog({
		title: 'Reset To Defaults',
		fields: [
			{fieldtype:"HTML", options:__("All customizations will be removed. Please confirm.")},
		],
		primary_action: function() {
			return frm.call({
				doc: frm.doc,
				method: "reset_to_defaults",
				callback: function(r) {
					if(r.exc) {
						msgprint(r.exc);
					} else {
						d.hide();
						frappe.customize_form.clear_locals_and_refresh(frm);
					}
				}
			});
		}
	});

	frappe.customize_form.confirm.dialog = d;
	d.show();
}

frappe.customize_form.clear_locals_and_refresh = function(frm) {
	// clear doctype from locals
	frappe.model.clear_doc("DocType", frm.doc.doc_type);
	delete frappe.meta.docfield_copy[frm.doc.doc_type];

	frm.refresh();
}

frappe.customize_form.add_fields_help = function(frm) {
	$(frm.grids[0].parent).before(
		'<div style="padding: 10px">\
			<a id="fields_help" class="link_type">Help</a>\
		</div>');
	$('#fields_help').click(function() {
		var d = new frappe.ui.Dialog({
			title: 'Help: Field Properties',
			width: 600
		});

		var help =
			"<table cellspacing='25'>\
				<tr>\
					<td><b>Label</b></td>\
					<td>Set the display label for the field</td>\
				</tr>\
				<tr>\
					<td><b>Type</b></td>\
					<td>Change type of field. (Currently, Type change is \
						allowed among 'Currency and Float')</td>\
				</tr>\
				<tr>\
					<td width='25%'><b>Options</b></td>\
					<td width='75%'>Specify the value of the field</td>\
				</tr>\
				<tr>\
					<td><b>Perm Level</b></td>\
					<td>\
						Assign a permission level to the field.<br />\
						(Permissions can be managed via Setup &gt; Role Permissions Manager)\
					</td>\
				</tr>\
				<tr>\
					<td><b>Width</b></td>\
					<td>\
						Width of the input box<br />\
						Example: <i>120px</i>\
					</td>\
				</tr>\
				<tr>\
					<td><b>Reqd</b></td>\
					<td>Mark the field as Mandatory</td>\
				</tr>\
				<tr>\
					<td><b>In Filter</b></td>\
					<td>Use the field to filter records</td>\
				</tr>\
				<tr>\
					<td><b>Hidden</b></td>\
					<td>Hide field in form</td>\
				</tr>\
				<tr>\
					<td><b>Print Hide</b></td>\
					<td>Hide field in Standard Print Format</td>\
				</tr>\
				<tr>\
					<td><b>Report Hide</b></td>\
					<td>Hide field in Report Builder</td>\
				</tr>\
				<tr>\
					<td><b>Allow on Submit</b></td>\
					<td>Allow field to remain editable even after submission</td>\
				</tr>\
				<tr>\
					<td><b>Depends On</b></td>\
					<td>\
						Show field if a condition is met<br />\
						Example: <code>eval:doc.status=='Cancelled'</code>\
						 on a field like \"reason_for_cancellation\" will reveal \
						\"Reason for Cancellation\" only if the record is Cancelled.\
					</td>\
				</tr>\
				<tr>\
					<td><b>Description</b></td>\
					<td>Show a description below the field</td>\
				</tr>\
				<tr>\
					<td><b>Default</b></td>\
					<td>Specify a default value</td>\
				</tr>\
				<tr>\
					<td></td>\
					<td><a class='link_type' \
							onclick='frappe.customize_form.fields_help_dialog.hide()'\
							style='color:grey'>Press Esc to close</a>\
					</td>\
				</tr>\
			</table>"

		$y(d.body, {padding: '32px', textAlign: 'center', lineHeight: '200%'});

		$a(d.body, 'div', '', {textAlign: 'left'}, help);

		d.show();

		frappe.customize_form.fields_help_dialog = d;

	});
}
