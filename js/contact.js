/*
 * Progressive enhancement for the contact form on /kontakt/.
 * Without JavaScript the form posts normally and the server redirects (303)
 * to /kontakt/danke/ or /kontakt/fehler/. With JavaScript the form is sent
 * via fetch and the result is shown inline.
 *
 * Server responses (Accept: application/json):
 *   200 {"ok":true}                                      -> success
 *   422 {"ok":false,"error":"invalid","fields":["email"]} -> mark fields
 *   429                                                   -> too many requests
 *   anything else / network error                         -> generic error
 */
(function () {
  "use strict";

  var form = document.querySelector("[data-contact-form]");
  if (!form || !window.fetch || !window.URLSearchParams || !window.FormData) {
    return;
  }

  var status = form.querySelector("[data-form-status]");
  var button = form.querySelector("button[type=submit]");
  var fallbackTpl = form.querySelector("template[data-fallback]");
  var fallback = fallbackTpl
    ? (fallbackTpl.content ? fallbackTpl.content.textContent : fallbackTpl.textContent).trim()
    : "";
  var buttonLabel = button.textContent;

  var FIELD_MESSAGES = {
    name: "Bitte geben Sie Ihren Namen an (höchstens 100 Zeichen).",
    email: "Bitte geben Sie eine gültige E-Mail-Adresse an.",
    phone: "Bitte prüfen Sie die Telefonnummer (höchstens 40 Zeichen).",
    message: "Bitte schreiben Sie eine Nachricht mit mindestens 10 und höchstens 5000 Zeichen."
  };

  function showStatus(kind, text) {
    status.className = "form-status form-status--" + kind;
    status.textContent = text;
  }

  function clearFieldErrors() {
    var invalid = form.querySelectorAll("[aria-invalid=true]");
    for (var i = 0; i < invalid.length; i++) {
      invalid[i].removeAttribute("aria-invalid");
      invalid[i].removeAttribute("aria-describedby");
    }
    var messages = form.querySelectorAll(".field-error");
    for (var j = 0; j < messages.length; j++) {
      messages[j].parentNode.removeChild(messages[j]);
    }
  }

  function markFields(fields) {
    var first = null;
    for (var i = 0; i < fields.length; i++) {
      var name = fields[i];
      var input = form.elements[name];
      if (!input || name === "website") {
        continue;
      }
      var id = "cf-error-" + name;
      var msg = document.createElement("p");
      msg.className = "field-error";
      msg.id = id;
      msg.textContent = FIELD_MESSAGES[name] || "Bitte prüfen Sie dieses Feld.";
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", id);
      input.parentNode.appendChild(msg);
      if (!first) {
        first = input;
      }
    }
    if (first) {
      first.focus();
    }
  }

  function setSending(sending) {
    button.disabled = sending;
    button.textContent = sending ? (button.getAttribute("data-label-sending") || buttonLabel) : buttonLabel;
    form.setAttribute("aria-busy", sending ? "true" : "false");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearFieldErrors();
    setSending(true);
    showStatus("info", "Ihre Nachricht wird gesendet …");

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams(new FormData(form))
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            return { status: response.status, data: data };
          });
      })
      .then(function (result) {
        if (result.status === 200 && result.data && result.data.ok) {
          form.reset();
          showStatus("success", "Vielen Dank! Ihre Nachricht ist angekommen. Ich melde mich in der Regel innert zwei Arbeitstagen.");
        } else if (result.status === 422) {
          var fields = (result.data && result.data.fields) || [];
          showStatus("error", "Bitte prüfen Sie die markierten Felder.");
          markFields(fields);
        } else if (result.status === 429) {
          showStatus("error", "Zu viele Anfragen. Bitte versuchen Sie es später erneut. " + fallback);
        } else {
          throw new Error("HTTP " + result.status);
        }
      })
      .catch(function () {
        showStatus("error", "Ihre Nachricht konnte leider nicht gesendet werden. " + fallback);
      })
      .then(function () {
        setSending(false);
      });
  });
})();
