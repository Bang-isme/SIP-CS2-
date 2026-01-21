// SQL Models Index - Export all Sequelize models
import sequelize from "../../mysqlDatabase.js";
import Earning from "./Earning.js";
import VacationRecord from "./VacationRecord.js";
import BenefitPlan from "./BenefitPlan.js";
import EmployeeBenefit from "./EmployeeBenefit.js";
import PayRate from "./PayRate.js";

export {
    sequelize,
    Earning,
    VacationRecord,
    BenefitPlan,
    EmployeeBenefit,
    PayRate,
};
