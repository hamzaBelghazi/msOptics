import React from "react";
import { useTranslation } from "react-i18next";

export default function Garantie() {
  document.title = "Garantie";
  const { t } = useTranslation();
  return (
    <div className="container-fluid my-5">
      <div className="row justify-content-center align-items-center">
        <div className="col-10 col-md-9">
          <div class="garantie_img text-center">
            <img
              src={`${process.env.REACT_APP_SERVER_URL}/assets/garantie.png`}
              alt="garantie"
              width={250}
            />
          </div>
          <div class="garantie_info">
            <h1 className="text-center">{t("garantie")}</h1>
            <p class="notice">{t("glasses_from")}</p>
            <p>{t("garantie_parag_one")}</p>
            <h3 className="h5 text-secondary">{t("garantie_parag_two")}</h3>
            <p>
              It's very simple, <strong>mhsoptics</strong> offers you a warranty
              with a period of 30 days in which you can try your glasses without
              obligation.
            </p>
            <p>
              <strong>mhsoptics</strong> is obliged to respect the European
              legal guarantee of hidden defects.
            </p>
            <div class="alert alert-danger">
              <p>
                <strong>Exception</strong> : In the absence of these elements,
                the Customer acknowledges that the mhsoptics Company reserves
                the right not to proceed with a refund, without being liable for
                this. Please contact Customer Service before returning an item.
              </p>
            </div>
            <h3 className="h5 text-secondary">
              Who pays the shipping costs for returns?
            </h3>
            <p>
              Since we are located in Europe,
              <strong>return shipping costs are offered (*)</strong>
              for the countries of the European Union (only for continental
              Europe). Below you will find a list of the countries for which we
              offer the return shipping costs:
            </p>
            <ul>
              <li>Austria</li>
              <li>Belgium</li>
              <li>Bulgaria</li>
              <li>Cyprus</li>
              <li>Czech</li>
              <li>Republic</li>
              <li>Croatia</li>
              <li>Denmark (except Greenland)</li>
              <li>Estonia</li>
              <li>Finland</li>
              <li>France (without DOM-TOM)</li>
              <li>Germany</li>
              <li>Greece</li>
              <li>Hungary</li>
              <li>Ireland</li>
              <li>Italy</li>
              <li>Latvia</li>
              <li>Lithuania</li>
              <li>Luxembourg</li>
              <li>Malta</li>
              <li>Netherlands (except Netherlands Antilles)</li>
              <li>Poland</li>
              <li>Portugal</li>
              <li>Romania</li>
              <li>Slovakia</li>
              <li>Slovenia</li>
              <li>Spain (except Canary Islands)</li>
              <li>Switzerland</li>
              <li>United Kingdom (excluding British Overseas Territories)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
