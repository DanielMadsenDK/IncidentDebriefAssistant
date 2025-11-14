import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '567c48dfdc3345569c76aeababb688ee'
                    }
                    'components/AnalysisPage.css': {
                        table: 'sys_ux_theme_asset'
                        id: 'e15337ea4b204e3f898ef54135d0afb4'
                        deleted: true
                    }
                    direct_analysis_module: {
                        table: 'sys_app_module'
                        id: '914f0173b7c74c2f908abc4b56bb9755'
                    }
                    incident_debrief_menu: {
                        table: 'sys_app_application'
                        id: 'bc6cf85ef16c43fe81ca2b8e4a6a2b58'
                    }
                    'incident-debrief-assistant': {
                        table: 'sys_ui_page'
                        id: '43501f84760642e6ae30adc69b0010c0'
                    }
                    IncidentAnalysisUtils: {
                        table: 'sys_script_include'
                        id: '382aecba9ef84c59bba2d60f2ef05d80'
                    }
                    new_analysis_module: {
                        table: 'sys_app_module'
                        id: '7c85d2d3e9484b6196c806f13d22b7af'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'c4581e17cf0b4648ad953c1453513cb5'
                    }
                    'src_server_script-includes_IncidentAnalysisUtils_js': {
                        table: 'sys_module'
                        id: 'd08bd8ca0d0041fdb0ca86e713b43170'
                    }
                    tools_separator: {
                        table: 'sys_app_module'
                        id: 'e6c1724fa8ac417a89965bfd88310cbe'
                    }
                    'x_1118332_incident/main': {
                        table: 'sys_ux_lib_asset'
                        id: 'cea2fd2d46434887912ce95588a50814'
                    }
                    'x_1118332_incident/main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: '3cf7299a46ae4b0e8c89d735cca2a495'
                    }
                }
            }
        }
    }
}
