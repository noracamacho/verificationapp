const EmailCode = require("./EmailCode");
const User = require("./User");


// Relationships
// 1to1
User.hasOne(EmailCode);
EmailCode.belongsTo(User); //Belongs to generates the Foreign Key
