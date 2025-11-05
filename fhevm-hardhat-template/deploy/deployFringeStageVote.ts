import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("FringeStageVote", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log(`FringeStageVote contract deployed at: ${deployed.address}`);
};

export default func;
func.id = "deploy_fringestagevote";
func.tags = ["FringeStageVote"];

