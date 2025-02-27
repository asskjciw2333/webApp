from omegaApp.logger_manager import LoggerManager
from omegaApp.db import get_db
import time
import asyncio

from flask import current_app

from ucscsdk.ucschandle import UcscHandle
from ucscsdk.ucscexception import UcscException

from ucsmsdk.ucshandle import UcsHandle

logger = LoggerManager().get_logger()


def find_server_by_name(server_name):

    username = current_app.config["USER_NAME_CENTRAL"]
    ucsc_ip = current_app.config["IP_CENTRAL"]
    password = current_app.config["PASSWORD_CENTRAL"]

    logger.info(f"Searching for server by name: {server_name}")
    try:
        handle = UcscHandle(ucsc_ip, username, password)

        # Login to UCS Central
        handle.login()

        logger.info(f"Searching for server by name: {server_name}")
        # Search for server by name
        rack_unit = handle.query_classid(
            "ComputeRackUnit",
            filter_str=f'(usr_lbl, ".*\\b{server_name}\\b$", type="re")',
        )
        for rack in rack_unit:
            line_of_Server = build_rack_unit_dict(handle, rack)
            return {"status": "success", "data": line_of_Server}

        blades = handle.query_classid(
            "ComputeBlade", filter_str=f'(usr_lbl, ".*\\b{server_name}\\b$", type="re")'
        )
        for blade in blades:
            line_of_Server = build_blade_dict(handle, blade)
            return {"status": "success", "data": line_of_Server}

        return {"status": "faild", "message": "לא נמצא שרת."}
    except Exception as e:
        return {"status": "faild", "message": f"יש פה איזו בעיה! - {e}"}
    finally:
        handle.logout()


def find_server_by_serial(server_serial_number):

    username = current_app.config["USER_NAME_CENTRAL"]
    ucsc_ip = current_app.config["IP_CENTRAL"]
    password = current_app.config["PASSWORD_CENTRAL"]

    try:
        handle = UcscHandle(ucsc_ip, username, password)

        # Login to UCS Central
        handle.login()

        logger.info(f"Searching for server by serial: {server_serial_number}")

        rack_unit = handle.query_classid(
            "ComputeRackUnit", filter_str=f'(serial,{server_serial_number}, type="eq")'
        )
        for rack in rack_unit:
            line_of_Server = build_rack_unit_dict(handle, rack)
            return {"status": "success", "data": line_of_Server}

        blades = handle.query_classid(
            "ComputeBlade", filter_str=f'(serial,{server_serial_number}, type="eq")'
        )
        for blade in blades:
            line_of_Server = build_blade_dict(handle, blade)
            return {"status": "success", "data": line_of_Server}

        return {"status": "faild", "message": "לא נמצא שרת."}
    except Exception as e:
        return {"status": "faild", "message": f"יש פה איזו בעיה! - {e}"}
    finally:
        handle.logout()


def find_server_by_location(server_location):

    username = current_app.config["USER_NAME_CENTRAL"]
    ucsc_ip = current_app.config["IP_CENTRAL"]
    password = current_app.config["PASSWORD_CENTRAL"]

    try:
        handle = UcscHandle(ucsc_ip, username, password)

        # Login to UCS Central
        handle.login()

        rack_unit = handle.query_classid(
            "ComputeRackUnit", filter_str=f'(name,{server_location}, type="eq")'
        )
        for rack in rack_unit:
            if server_location.lower() == rack.name.lower():
                line_of_Server = build_rack_unit_dict(handle, rack)
                return {"status": "success", "data": line_of_Server}

        blades = handle.query_classid(
            "ComputeBlade", filter_str=f'(name,{server_location}, type="eq")'
        )
        for blade in blades:
            if server_location.lower() == blade.name.lower():
                line_of_Server = build_blade_dict(handle, blade)
                return {"status": "success", "data": line_of_Server}

        return {"status": "faild", "message": "לא נמצא שרת."}

    except Exception as e:
        return {"status": "faild", "message": f"יש פה איזו בעיה! - {e}"}
    finally:
        handle.logout()


def build_rack_unit_dict(handle, rack):
    line_of_Server = {}
    line_of_Server["serial"] = rack.serial
    line_of_Server["dn"] = rack.dn
    line_of_Server["name"] = rack.name
    line_of_Server["usr_lbl"] = rack.usr_lbl
    line_of_Server["ls_dn"] = rack.assigned_to_dn
    line_of_Server["local_id"] = rack.local_id
    line_of_Server["id"] = rack.id
    line_of_Server["version"] = get_firmware_version(handle, rack.dn)
    line_of_Server["domain"] = get_domain_name(handle, rack.assigned_to_dn, rack.dn)

    return line_of_Server


def build_blade_dict(handle, blade):
    line_of_Server = {}
    line_of_Server["serial"] = blade.serial
    line_of_Server["dn"] = blade.dn
    line_of_Server["name"] = blade.name
    line_of_Server["usr_lbl"] = blade.usr_lbl
    line_of_Server["ls_dn"] = blade.assigned_to_dn
    line_of_Server["local_id"] = blade.local_id
    line_of_Server["id"] = blade.server_id
    line_of_Server["version"] = get_firmware_version(handle, blade.dn)
    line_of_Server["domain"] = get_domain_name(handle, blade.assigned_to_dn, blade.dn)

    return line_of_Server


def get_firmware_version(handle, server_dn):
    # Retrieve associated firmware running details
    fw_details = handle.query_children(in_dn=server_dn, class_id="FirmwareStatus")[0]

    if fw_details:
        return fw_details.package_version

    print("No firmware version found for the server.")
    return None


def get_domain_name(handle, server_ls_dn, blade_dn):
    # Query the server managed object
    if server_ls_dn:
        server = handle.query_dn(server_ls_dn)
        if not server:
            print(f"No server found with Ls_DN: {server_ls_dn}")
            return None

        if server.domain:
            return server.domain
    else:
        domain_list = handle.query_classid(class_id="ExtpolClient")
        for domain in domain_list:
            if domain.id in blade_dn:
                return domain.name

    print("No domain found for the server.")
    return None


def get_firmware_list():

    username = current_app.config["USER_NAME_CENTRAL"]
    ucsc_ip = current_app.config["IP_CENTRAL"]
    password = current_app.config["PASSWORD_CENTRAL"]

    try:
        handle = UcscHandle(ucsc_ip, username, password)

        # Login to UCS Central
        handle.login()
        Fimware_List_To_Return = []
        Fimware_Line = {}
        fw_list = handle.query_classid(class_id="FirmwareComputeHostPack")
        for fw in fw_list:
            Fimware_Line["dn"] = fw.dn
            Fimware_Line["name"] = fw.name
            Fimware_Line["blade_bundle_version"] = fw.blade_bundle_version
            Fimware_Line["rack_bundle_version"] = fw.rack_bundle_version
            Fimware_List_To_Return.append(Fimware_Line)
            Fimware_Line = {}
        return Fimware_List_To_Return
    finally:
        handle.logout()


class UCSFirmwareUpgrader:
    def __init__(self, hostname, username, password):
        self.handle = UcscHandle(hostname, username, password)
        self.upgrade_status = {}  # Dictionary to store upgrade status for each server
        self.login()

    def login(self):
        try:
            self.handle.login()
            logger.info("Successfully logged in to UCSC")
        except UcscException as e:
            logger.error(f"Failed to log in to UCSC: {str(e)}")
            raise

    def logout(self):
        if self.handle:
            self.handle.logout()
            logger.info("Logged out from UCSC")

    def find_upgrade_server(self, serial_number):
        try:
            rack_unit = self.handle.query_classid(
                "ComputeRackUnit", filter_str=f'(serial,{serial_number}, type="eq")'
            )
            for rack in rack_unit:
                return rack

            blades = self.handle.query_classid(
                "ComputeBlade", filter_str=f'(serial,{serial_number}, type="eq")'
            )
            for blade in blades:
                return blade

            return False

        except Exception as e:
            raise Exception({"message": f"יש פה איזו בעיה! - {e}"})

    def check_server_profile(self, server):
        try:
            ls_server = self.handle.query_dn(server.assigned_to_dn)
            if ls_server:
                logger.info(f"Server {server.dn} has a service profile")
                return True
            else:
                logger.info(f"Server {server.dn} does not have a service profile")
                return False
        except UcscException as e:
            logger.error(f"Error checking server profile: {str(e)}")
            raise Exception(f"Error checking server profile: {str(e)}")

    def disconnect_template(self, server):
        try:
            ls_server = self.handle.query_dn(server.assigned_to_dn)
            if ls_server:
                original_template = ls_server.src_templ_name
                ls_server.src_templ_name = ""
                self.handle.set_mo(ls_server)
                self.handle.commit()
                logger.info(f"Disconnected template from server: {server.dn}")
                return original_template
            else:
                logger.warning(f"No profile found for server {server.dn}")
        except UcscException as e:
            logger.error(f"Error disconnectiong template: {str(e)}")
            raise

    def connect_template(self, server, original_template):
        try:
            ls_server = self.handle.query_dn(server.assigned_to_dn)
            if ls_server:
                ls_server.src_templ_name = original_template
                self.handle.set_mo(ls_server)
                self.handle.commit()
                logger.info(f"Reconnected profile to server {server.dn}")
            else:
                logger.warning(f"No profile found for server {server.dn}")
        except UcscException as e:
            logger.error(f"Error connecting profile: {str(e)}")
            raise

    def upgrade_server(self, server, firmware_version):
        logger.info(
            f"Starting upgrade_server function for server {server.dn} to vertion {firmware_version}"
        )
        try:
            start_time = time.time()

            all_fw_pkgs = self.handle.query_classid("FirmwareComputeHostPack")

            logger.info(f"Found {len(all_fw_pkgs)} FirmwareComputeHostPacks")

            if not all_fw_pkgs:
                logger.error("No FirmwareComputeHostPacks found")
                raise ValueError("No FirmwareComputeHostPacks found")

            logger.info("Available attributes for FirmwareComputeHostPack:")

            fw_pkg = None
            for pkg in all_fw_pkgs:
                if pkg.name == firmware_version:
                    fw_pkg = pkg
                    logger.info(f"Found matching firmware package: {pkg.dn}")
                    break
                if fw_pkg:
                    break

            query_time = time.time() - start_time
            logger.info(f"Query completed in {query_time:.2f} seconds")
            if not fw_pkg:
                raise ValueError(
                    f"Firmware package version {firmware_version} not found"
                )
            ls_server = self.handle.query_dn(server.assigned_to_dn)
            ls_server.host_fw_policy_name = fw_pkg.name
            self.handle.add_mo(ls_server, modify_present=True)
            self.handle.commit()
            logger.info(
                f"Initiated firmware upgrade for server {server.dn} to version {firmware_version}"
            )
        except UcscException as e:
            logger.error(f"Error upgrading server firmware: {str(e)}")
            raise

    def monitor_upgrade_progress(self, ucsmhandel, server):
        try:
            logger.info(
                f"Monitoring upgrade progress for server: {server['server_name']}"
            )

            # Get current status from DB for state checks
            current_server_data = self.get_data_from_db(server["instance_id"])
            current_status = current_server_data["status"]

            UCSserver = ucsmhandel.query_classid(
                "ComputeRackUnit",
                filter_str=f'(usr_lbl, ".*\\b{server["server_name"]}\\b$", type="re")',
            )

            if UCSserver:
                for ser in UCSserver:
                    fsm_status = ser.fsm_status
                    fsm_progress = ser.fsm_progr

                    if fsm_status == "nop":
                        # If status is already running in DB, this means we finished
                        if current_status == "running" or current_status == "completed":
                            return 101  # Upgrade completed
                        # If status is not running, we haven't started yet
                        logger.info("Waiting for upgrade to start...")
                        return 0

                    # If we get here, fsm_status is not "nop", meaning upgrade is in progress

                    if "fail" in fsm_status.lower():
                        raise Exception(f"Upgrade failed: {fsm_status}")

                    logger.info(f"Upgrade in progress: {fsm_status}")
                    logger.info(f"Upgrade progress: {fsm_progress}%")
                    return fsm_progress

            else:
                UCSserver = ucsmhandel.query_classid(
                    "ComputeBlade",
                    filter_str=f'(usr_lbl, ".*\\b{server["server_name"]}\\b$", type="re")',
                )
                for ser in UCSserver:
                    fsm_status = ser.fsm_status
                    fsm_progress = ser.fsm_progr

                    if fsm_status == "nop":
                        # If status is already running in DB, this means we finished
                        if current_status == "running" or current_status == "completed":
                            return 101  # Upgrade completed
                        # If status is not running, we haven't started yet
                        logger.info("Waiting for upgrade to start...")
                        return 0

                    # If we get here, fsm_status is not "nop", meaning upgrade is in progress

                    if "fail" in fsm_status.lower():
                        raise Exception(f"Upgrade failed: {fsm_status}")

                    logger.info(f"Upgrade in progress: {fsm_status}")
                    logger.info(f"Upgrade progress: {fsm_progress}%")
                    return fsm_progress

        except UcscException as e:
            logger.error(f"Error monitoring upgrade progress: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in monitor_upgrade_progress: {str(e)}")
            raise

    async def restart_required(self, server, instance_id, check_interval=10, timeout=360):
        start_time = time.time()
        last_state = None

        while True:
            try:
                ls_server = self.handle.query_dn(server.assigned_to_dn)
                current_state = ls_server.oper_state
                
                # Log state change
                if current_state != last_state:
                    logger.info(f"Server {server.dn} state changed from {last_state} to {current_state}")
                    last_state = current_state

                if current_state == "pending-reboot":
                    logger.info(
                        f"Server {server.dn} requires restart. Continuing with the process."
                    )
                    return True
                    
                if current_state == "config":
                    logger.info(
                        f"Server {server.dn} in configuration. Waiting for state change."
                    )
                    return False

                elapsed_time = time.time() - start_time
                if elapsed_time >= timeout:
                    logger.warning(
                        f"Timeout reached. Server {server.dn} did not require restart within {timeout} seconds."
                    )
                    return False

                logger.info(
                    f"Server {server.dn} does not require restart yet (state: {current_state}). Checking again in {check_interval} seconds."
                )
                # Update DB to show we're still running
                self.update_db(
                    "message",
                    f"Checking if server requires restart (current state: {current_state})",
                    instance_id
                )
                self.update_db("status", "running", instance_id)
                try:
                    logger.info(f"Starting sleep in normal state for server {server.dn}")
                    await asyncio.sleep(check_interval)
                    logger.info(f"Sleep completed normally in normal state for server {server.dn}")
                except asyncio.CancelledError:
                    # Check if this was a user-initiated cancellation by checking DB status
                    logger.info(f"Sleep cancelled in normal state for server {server.dn}, checking status")
                    server_data = self.get_data_from_db(instance_id)
                    logger.info(f"Current status in DB: {server_data['status']}, message: {server_data['message']}")
                    if server_data["status"] == "stopped":
                        logger.info(f"User cancelled automation for server {server.dn}")
                        server = self.find_upgrade_server(server_data["serial_number"])
                        self.connect_template(server, server_data["tamplate"])
                        raise  # Re-raise to properly cancel the automation
                    else:
                        logger.info(f"Non-user cancellation for server {server.dn}, continuing operation")
                        continue
                continue

            except UcscException as e:
                logger.error(
                    f"Error checking restart requirement for server {server.dn}: {str(e)}"
                )
                raise

            except Exception as e:
                logger.error(
                    f"Unexpected error in wait_for_restart_required for server {server.dn}: {str(e)}"
                )
                return False

    def restart_server(self, server, max_retries=10, retry_delay=10):
        """
        Restart a server with retry mechanism and status verification.

        Args:
            server: Server object to restart
            max_retries: Maximum number of restart attempts (default: 3)
            retry_delay: Delay between retries in seconds (default: 10)
        """
        for attempt in range(max_retries):
            try:
                ls_server = self.handle.query_dn(server.assigned_to_dn)
                if not ls_server:
                    raise Exception(f"Server not found at DN: {server.assigned_to_dn}")

                server_name = "req-" + ls_server.name
                acks = self.handle.query_classid(
                    "LsmaintAck", filter_str=f'(dn, {server_name}, type="re")'
                )

                if not acks:
                    logger.warning(
                        f"No maintenance acknowledgments found for server {server_name}"
                    )
                    raise Exception(
                        f"No maintenance acknowledgments found for server {server_name}"
                    )

                restart_initiated = False
                for ack in acks:
                    try:
                        maintAck = self.handle.query_dn(ack.dn)
                        if not maintAck:
                            continue

                        maintAck.admin_state = "trigger-immediate"
                        maintAck.status = "modified"
                        self.handle.add_mo(maintAck, True)
                        self.handle.commit()
                        restart_initiated = True
                        logger.info(
                            f"Restart command sent for server {server.dn} (Attempt {attempt + 1}/{max_retries})"
                        )
                    except Exception as inner_e:
                        logger.warning(
                            f"Failed to process maintenance ack {ack.dn}: {str(inner_e)}"
                        )
                        continue

                if not restart_initiated:
                    raise Exception(
                        "Failed to initiate restart - no valid maintenance acknowledgments processed"
                    )

                # Verify the restart was initiated by checking server status
                time.sleep(5)  # Wait for restart to begin
                if self._verify_restart_initiated(server):
                    logger.info(
                        f"Successfully verified restart initiation for server {server.dn}"
                    )
                    return True

                if attempt < max_retries - 1:
                    logger.warning(
                        f"Restart verification failed, retrying in {retry_delay} seconds..."
                    )
                    time.sleep(retry_delay)

            except UcscException as e:
                logger.error(
                    f"UCSC error during restart attempt {attempt + 1}: {str(e)}"
                )
                if attempt < max_retries - 1:
                    logger.info(f"Retrying restart in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    raise Exception(
                        f"Failed to restart server after {max_retries} attempts: {str(e)}"
                    )

        raise Exception(f"Failed to restart server after {max_retries} attempts")

    def _verify_restart_initiated(self, server):
        """
        Verify that the server restart was actually initiated by checking if it's no longer in pending-reboot state.

        Args:
            server: Server object to verify

        Returns:
            bool: True if restart was initiated, False otherwise
        """
        try:
            ls_server = self.handle.query_dn(server.assigned_to_dn)
            # If server is no longer in pending-reboot state, it means restart was initiated
            return ls_server.oper_state != "pending-reboot"
        except Exception as e:
            logger.warning(f"Error verifying restart status: {str(e)}")
            return False

    def update_db(self, col, value, instance_id):
        # Update progress in database
        try:
            db = get_db()
            db.execute(
                f"UPDATE automations SET {col} = ? WHERE instance_id = ?",
                (value, instance_id),
            )
            db.commit()
        except Exception as e:
            logger.error(f"update_db error: {e} ")
            raise Exception(f"update_db error: {e} ")

    def get_data_from_db(self, instance_id):
        try:
            logger.info(f"Getting data from db for instance_id: {instance_id}")
            db = get_db()
            data = db.execute(
                "SELECT * FROM automations WHERE instance_id = ?", (instance_id,)
            ).fetchall()
            db.commit()
            logger.info(f"Data from db: {data}")
            return data[0]
        except Exception as e:
            raise Exception(f"get_data_from_db(): {e}")

    async def upgrade_firmware(self, server_upgrade):
        serial_number = server_upgrade["serial_number"]
        target_firmware = server_upgrade["data"]
        force_direct_upgrade = server_upgrade["force_direct_upgrade"]
        intermediate_version = server_upgrade["intermediate_version"]

        server = self.find_upgrade_server(serial_number)
        if not server:
            yield {"message": f"Upgrade failed: Not found server"}
        else:
            has_profile = self.check_server_profile(server)
            try:
                isRunning = server_upgrade["progress"]
                original_template = server_upgrade["tamplate"]
            except Exception as e:
                logger.error(f"Error progress or tamplate prameters: {e}")
                raise Exception(f"Error progress or tamplate prameters: {e}")
            try:
                if has_profile:
                    server_firmware = get_firmware_version(self.handle, server.dn)

                    if force_direct_upgrade:
                        logger.warning(
                            f"Force direct upgrade enabled for server {server.dn} from version {server_firmware} to {target_firmware}"
                        )

                    # Check if double upgrade is needed
                    need_2_steps = self.needs_double_upgrade(
                        server_firmware, force_direct_upgrade=force_direct_upgrade
                    )

                    while True:
                        current_firmware = target_firmware
                        
                        if need_2_steps:
                            if not intermediate_version and not force_direct_upgrade:
                                error_msg = (
                                    f"שגיאה: נדרש שדרוג דו-שלבי מגרסה {server_firmware}. "
                                    f"יש לבחור גרסת ביניים או לסמן 'הכרח שדרוג ישיר'"
                                )
                                logger.error(error_msg)
                                raise Exception(error_msg)
                            
                            if intermediate_version:
                                current_firmware = intermediate_version
                                logger.info(
                                    f"{server_firmware} ==> Need 2 steps <== Upgrading to intermediate version {intermediate_version} before {target_firmware}"
                                )

                        if isRunning == 0:
                            original_template = self.disconnect_template(server)
                            if original_template:
                                self.update_db(
                                    "tamplate",
                                    original_template,
                                    server_upgrade["instance_id"],
                                )
                            yield {"message": "Disconnected server profile"}

                            logger.info(
                                f"Initiating firmware upgrade for server {server.dn} to version {current_firmware}"
                            )
                            self.upgrade_server(server, current_firmware)
                            yield {
                                "message": f"Initiated firmware upgrade to version {current_firmware}"
                            }
                            if await self.restart_required(server, server_upgrade["instance_id"]):
                                self.restart_server(server)
                                yield {"message": "Server restart initiated"}

                        # Found domain IP
                        server_lsdn = self.handle.query_dn(
                            dn=server.assigned_to_dn, need_response=True
                        )
                        out_configs = server_lsdn.out_config
                        domain_object = self.handle.query_dn(
                            out_configs.child[0].domain_dn
                        )
                        domain_ip = domain_object.address

                        logger.info(f"Ucs menager ip: {domain_ip}")

                        # login - ucs menager
                        ucsmhandel = UcsHandle(
                            domain_ip,
                            current_app.config["USER_NAME_CENTRAL"],
                            current_app.config["PASSWORD_CENTRAL"],
                        )
                        ucsmhandel.login()

                        progress = 0
                        while progress != 101:  # Upgrade not completed
                            progress = self.monitor_upgrade_progress(
                                ucsmhandel, server_upgrade
                            )
                            yield {"progress": progress}
                            try:
                                logger.info(f"Starting sleep in upgrade_firmware for server {server.dn}")
                                await asyncio.sleep(10)  # Check progress every 10 seconds
                                logger.info(f"Sleep completed normally in upgrade_firmware for server {server.dn}")
                            except asyncio.CancelledError:
                                # Check if this was a user-initiated cancellation
                                logger.info(f"Sleep cancelled in upgrade_firmware for server {server.dn}, checking status")
                                server_data = self.get_data_from_db(server_upgrade["instance_id"])
                                logger.info(f"Current status in DB: {server_data['status']}, message: {server_data['message']}")
                                if server_data["status"] == "stopped":
                                    logger.info(f"User cancelled automation for server {server.dn}")
                                    if not original_template:
                                        original_template = server_upgrade["tamplate"]
                                    self.connect_template(server, original_template)
                                    raise  # Re-raise to properly cancel the automation
                                else:
                                    logger.info(f"Non-user cancellation for server {server.dn}, continuing operation")
                                    continue

                        ucsmhandel.logout()

                        if not original_template:
                            original_template = server_upgrade["tamplate"]

                        if need_2_steps:
                            need_2_steps = False
                            current_firmware = target_firmware
                            isRunning = 0
                        else:
                            break

                    self.connect_template(server, original_template)
                    yield {
                        "message": "Reconnected server profile to template",
                        "progress": 101,
                    }
                    yield {"message": "Upgrade completed successfully", "progress": 101}

            except Exception as e:
                logger.error(f"Upgrade failed: {str(e)}")
                raise Exception(f"Upgrade failed: {str(e)}")
            finally:
                self.logout()

    def needs_double_upgrade(self, current_version, force_direct_upgrade=False):
        """
        Determines if a server needs a double-step upgrade based on its current firmware version.
        Returns bool - needs_double_upgrade

        Args:
            current_version: Current firmware version (e.g. "3.2(1d)B", "4.0(2b)", etc.)
            force_direct_upgrade: If True, will skip double upgrade check
        """
        try:
            if force_direct_upgrade:
                logger.warning(
                    "Force direct upgrade enabled - skipping double upgrade check"
                )
                return False

            # Versions that always need double upgrade regardless of version number
            specific_versions = [
                "3.2(1d)B",
                "3.2(1d)C",
                "3.2(2b)C",
                "3.2(2c)C",
                "3.2(2c)B",
            ]

            # First check specific versions that always need double upgrade
            if any(ver in current_version for ver in specific_versions):
                return True

            # Extract version numbers using regex to handle various formats
            import re
            version_match = re.match(r'(\d+)\.(\d+)', current_version)
            if not version_match:
                logger.warning(f"Could not parse version number from {current_version}")
                return False

            major, minor = map(int, version_match.groups())
            
            # Need double upgrade if version is below 4.0
            return major < 4

        except Exception as e:
            logger.error(f"Error in needs_double_upgrade: {str(e)}")
            # If we can't determine, assume single upgrade for safety
            return False
