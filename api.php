<?php

require_once __DIR__.'/../vendor/autoload.php';

use Symfony\Component\HttpFoundation\JsonResponse;

$app = new Silex\Application();

$app->register(new Silex\Provider\DoctrineServiceProvider(), array(
    'db.options' => array(
        'driver'   => 'pdo_mysql',
        'host'      => 'localhost',
        'dbname' => 'kowalik_controller',
        'user' => '###',
        'password' => '###',
        'charset' => 'UTF8'
    ),
));

$app->register(new Silex\Provider\SessionServiceProvider());

$app->register(new Silex\Provider\SecurityServiceProvider());

$app

$app['debug'] = true;

class DataProvider {
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getRequestData()
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    public function getDataToSend()
    {
        $sql = "SELECT * FROM data_to_send";
        $data = $this->db->fetchAll($sql);
        if(!$data){
            return false;
        }
        return $data[0]['data'];
    }

    public function getLastData()
    {
        $sql = "SELECT * FROM stored_data order by id desc limit 1";

        return $this->db->fetchAll($sql);
    }

    public function addArduinoData($Data)
    {
        $Data['date'] = date("Y-m-d H:i:s");
        
        $result = $this->db->insert('stored_data', $Data);

        if(!$result){
            return false;
        }

        return $this->db->lastInsertId();
    }
    public function addArduinoStatus($Data)
    {
    	$Data['id'] = 1;
        $result = $this->db->insert('received_status', $Data);

       	if(!$result){
           return false;
        }

		$this->db->delete('data_to_send', ['id' => 1]);

       	return true;
    }
    public function addDataToSend($Data)
    {
    	//$Data['id'] = 1; //remove comment in this line when simulator is no use
        //$result = $this->db->insert('data_to_send', $Data); //remove comment in this line when simulator is no use
        
        // begin simulator
        $sql = "INSERT INTO data_to_send VALUES (1, '".$Data['data']."') ON DUPLICATE KEY UPDATE data='".$Data['data']."'";
        $result = $this->db->query($sql);
        $number = $Data['data'][1];
        $state = $Data['data'][3];
        $updatedData[$number] = $state;
        $sql2 = "UPDATE stored_data SET valve".$number." = ".$state." order by ID desc limit 1";
        $this->db->query($sql2);
       	// end simalator

        if(!$result){
           return false;
        }

       	return true;
    }

    public function getStatus()
    {
        $sql = "SELECT * FROM received_status";

        $data = $this->db->fetchAll($sql);
        if(!$data){
            return false;
        }
         if($data[0]['status']=='ok'){ 
        $this->db->delete('data_to_send', ['id' => 1]);
        $this->db->delete('received_status', ['id' => 1]);
		}

       	return $data[0]['status']; 
    }

    public function deleteStatus()
    {
        $this->db->delete('received_status', ['id' => 1]);
        return true;
    }


    public function getDataDay($day)
    {
        $sql = "SELECT *, date_format(date,'%H:%i:%s') as only_short_date FROM stored_data WHERE (date BETWEEN '".$day." 00:00:00' AND '".$day." 23:59:59') AND (( id % 50 ) = 0)";
        return  $this->db->fetchAll($sql);
    }

    public function updateAutoSetting($data)
    {
		$data['id'] = 1;
        $this->db->update('auto_setting', $data, ['id' => 1]);
        return true;
    }
    public function getAuto()
    {
        $sql = "SELECT * FROM auto_setting WHERE id = 1";
        return  $this->db->fetchAll($sql);
    }

    public function valvesTurnOff()
    {
        $sql2 = "UPDATE stored_data SET valve1 = 0, valve2 = 0 order by ID desc limit 1";
        $this->db->query($sql2);
        return true;
    }
};

$DataProvider = new DataProvider($app['db']);

$app->get('/getLastData', function () use ($app, $DataProvider) {
    // $data = $DataProvider->getLastData();//uncomment when simulator is not use
    $data2 = $DataProvider->getAuto();
    
    //simulator current data from arduino
    $lastData = $DataProvider->getLastData(); 
    $data['valve1'] = $lastData[0]['valve1'];
    $data['valve2'] = $lastData[0]['valve2'];;
    $data['tempIN'] = rand(250, 260) / 10;
    $data['humIN'] =  rand(650, 660) / 10;
    $data['tempOUT'] =  rand(100, 110) / 10;
    $data['humOUT'] =  rand(760, 770) / 10;
    $data['soilHum'] =  rand(350, 360) / 10;
    $data['date'] = date("Y-m-d H:i:s");
    //add random data to database
    $newArduinoData = $DataProvider->addArduinoData($data);
    $data[0]=$data;
    //end simulator

    $data[0]['status']=$data2[0]['status'];
    if(false == $newArduinoData){
        return $app->json(['errorMessage' => 'Can not insert data'], 500);
    }

    return $app->json($data);
});

$app->put('/data/{valve1}/{valve2}/{tempIN}/{humIN}/{tempOUT}/{humOUT}/{soilHum}',
	function ($valve1, $valve2, $tempIN, $humIN, $tempOUT, $humOUT, $soilHum)
	use ($app, $DataProvider) {

	$insertData['valve1'] = $valve1;
	$insertData['valve2'] = $valve2;
	$insertData['tempIN'] = $tempIN;
	$insertData['humIN'] = $humIN;
	$insertData['tempOUT'] = $tempOUT;
	$insertData['humOUT'] = $humOUT;
	$insertData['soilHum'] = $soilHum;

    $newArduinoData = $DataProvider->addArduinoData($insertData);

    if(false == $newArduinoData){
        return $app->json(['errorMessage' => 'Can not insert data'], 500);
    }   


	$ReceivedData = $DataProvider->getDataToSend();

    if($ReceivedData){
        return $ReceivedData;
    }

    return '';
});

$app->put('/responseArduino/{status}', function ($status) use ($app, $DataProvider) {
	$insertData['status'] = $status;
    
    $putStatus = $DataProvider->addArduinoStatus($insertData);

    if(false == $putStatus){
        return $app->json(['errorMessage' => 'Can not insert status'], 500);
    }   
    return '';
});

$app->put('/changeValve/{valve}/{state}', function ($valve, $state) use ($app, $DataProvider) {

	$insertData['data'] = ($valve == 1) ? 'v1=' : 'v2=';
	$insertData['data'] = $insertData['data'].$state;
    
    $newData = $DataProvider->addDataToSend($insertData);

    if(false == $newData){
        return $app->json(['errorMessage' => 'Can not insert data'], 500);
    } 

    $updateStatus['status'] = 0;
	$newData = $DataProvider->updateAutoSetting($updateStatus);
 
    if(false == $newData){
        return $app->json(['errorMessage' => 'Can not update data'], 500);
    } 
    return '';
});


$app->get('/receivedStatus', function () use ($app, $DataProvider) {

    $status = $DataProvider->getStatus();
    $status = 'ok';// remove this line when simulator is not use
    return $app->json($status);
});

$app->get('/getDataDay/{day}', function ($day) use ($app, $DataProvider) {

    $data = $DataProvider->getDataDay($day);

    return $app->json($data);
});

$app->delete('/receivedStatus', function () use ($app, $DataProvider) {

    $DataProvider->deleteStatus($clientId);

    return $app->json(['message' => 'Status deleted!']);
});

$app->put('/changeAuto/{from}/{to}/{minutes}/{status}', function ($from, $to, $minutes, $status) use ($app, $DataProvider) {

    // uncomment this part of code when simulator is not use
	//$insertData['data'] = 'f='.$from.'t='.$to.'m='.$minutes.'s='.$status;
    //$newData = $DataProvider->addDataToSend($insertData);

    //if(false == $newData){
    //    return $app->json(['errorMessage' => 'Can not insert data'], 500);
    //}
    $DataProvider->valvesTurnOff();// remove this line when simulator not use

	$updateData['humFrom'] = $from;
	$updateData['humTo'] = $to;
	$updateData['minutes'] = $minutes;
	$updateData['status'] = $status;
	$newData2 = $DataProvider->updateAutoSetting($updateData);
 
    if(false == $newData2){
        return $app->json(['errorMessage' => 'Can not update data'], 500);
    } 

	return '';
});

$app->get('/getAuto', function () use ($app, $DataProvider) {

    $data = $DataProvider->getAuto();

    return $app->json($data);
});

$app->run();
